import { NextResponse } from 'next/server';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

async function getPlacePhotos(placeId: string) {
    const placeDetailsResponse = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
        headers: {
            'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY!,
            'X-Goog-FieldMask': 'photos,location'
        }
    });

    const placeDetails = await placeDetailsResponse.json();
    return { photos: placeDetails.photos, location: placeDetails.location };
}

async function searchNearbyPlaces(lat: number, lng: number, radius: number) {
    const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY!,
            'X-Goog-FieldMask': 'places.id,places.displayName'
        },
        body: JSON.stringify({
            locationRestriction: {
                circle: {
                    center: {
                        latitude: lat,
                        longitude: lng
                    },
                    radius: radius
                }
            },
            maxResultCount: 10
        })
    });

    const data = await response.json();
    return data.places || [];
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const placeId = searchParams.get('placeId');

    console.log('[Images API] Received request with placeId:', placeId);

    if (!placeId) {
        return NextResponse.json({ error: 'Place ID is required' }, { status: 400 });
    }

    try {
        // First try getting photos for the requested place
        const { photos, location } = await getPlacePhotos(placeId);

        if (photos?.length) {
            const photoName = photos[0].name;
            const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?key=${GOOGLE_MAPS_API_KEY}&maxHeightPx=1080&maxWidthPx=1920`;
            console.log('[Images API] Found photo for original place');
            return NextResponse.json({ photoUrl });
        }

        if (!location) {
            console.log('[Images API] No location data found for place');
            return NextResponse.json({ error: 'No photos or location data found for this place' }, { status: 404 });
        }

        console.log('[Images API] No photos found, searching nearby places');

        // Search nearby places with increasing radius until we find a photo
        const searchRadii = [200, 500, 1000]; // meters

        for (const radius of searchRadii) {
            console.log(`[Images API] Searching within ${radius}m radius`);
            const nearbyPlaces = await searchNearbyPlaces(location.latitude, location.longitude, radius);

            for (const place of nearbyPlaces) {
                if (place.id === placeId) continue; // Skip the original place

                const { photos: placePhotos } = await getPlacePhotos(place.id);
                if (placePhotos?.length) {
                    const photoName = placePhotos[0].name;
                    const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?key=${GOOGLE_MAPS_API_KEY}&maxHeightPx=1080&maxWidthPx=1920`;
                    console.log(`[Images API] Found photo from nearby place: ${place.displayName.text}`);
                    return NextResponse.json({
                        photoUrl,
                        sourcePlaceName: place.displayName.text
                    });
                }
            }
        }

        console.log('[Images API] No photos found in any nearby places');
        return NextResponse.json({ error: 'No photos found in this area' }, { status: 404 });

    } catch (error) {
        console.error('[Images API] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch place photo' }, { status: 500 });
    }
}
