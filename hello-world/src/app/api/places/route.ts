import { NextResponse } from 'next/server';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    console.log('[Places API] Received request for coordinates:', { lat, lng });

    if (!lat || !lng) {
        return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 });
    }

    try {
        // Use the new Places API v1 Nearby Search
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
                            latitude: parseFloat(lat),
                            longitude: parseFloat(lng)
                        },
                        radius: 100.0
                    }
                },
                maxResultCount: 1
            })
        });

        const data = await response.json();
        console.log('[Places API] Nearby search response:', JSON.stringify(data, null, 2));

        if (!data.places?.length) {
            console.log('[Places API] No results found in nearby search');
            return NextResponse.json({ error: 'No place found at this location' }, { status: 404 });
        }

        // The place ID is now in the id field of the place object
        const placeId = data.places[0].id;
        console.log('[Places API] Found place ID:', placeId);
        return NextResponse.json({ placeId });

    } catch (error) {
        console.error('[Places API] Error:', error);
        return NextResponse.json({ error: 'Failed to find place' }, { status: 500 });
    }
}
