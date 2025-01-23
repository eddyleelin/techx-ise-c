import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');

    if (!lat || !lon) {
        return NextResponse.json({ error: 'Latitude and longitude parameters are required' }, { status: 400 });
    }

    try {
        // Fetch weather data
        const weatherUrl = new URL('https://api.open-meteo.com/v1/forecast');
        weatherUrl.searchParams.append('latitude', lat);
        weatherUrl.searchParams.append('longitude', lon);
        weatherUrl.searchParams.append('current', 'temperature_2m,wind_speed_10m,relative_humidity_2m');
        weatherUrl.searchParams.append('timezone', 'auto');
        console.log('Weather API URL:', weatherUrl.toString());

        const weatherResponse = await fetch(weatherUrl.toString());
        if (!weatherResponse.ok) {
            throw new Error('Failed to fetch weather data');
        }
        const weatherData = await weatherResponse.json();

        // Fetch location data using OpenStreetMap Nominatim
        const geocodeUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
        const geocodeResponse = await fetch(geocodeUrl, {
            headers: {
                'User-Agent': 'HelloWorldWeatherApp/1.0'
            }
        });

        if (!geocodeResponse.ok) {
            throw new Error('Failed to fetch location data');
        }

        const locationData = await geocodeResponse.json();
        const cityName = locationData.address?.city ||
            locationData.address?.town ||
            locationData.address?.village ||
            locationData.address?.suburb ||
            'Unknown Location';

        const formattedResponse = {
            location: {
                coordinates: {
                    latitude: parseFloat(lat),
                    longitude: parseFloat(lon),
                },
                city: cityName,
                display_name: locationData.display_name
            },
            weather: {
                temperature: `${Math.round(weatherData.current.temperature_2m)}°C`,
                wind_speed: `${weatherData.current.wind_speed_10m} m/s`,
                humidity: `${weatherData.current.relative_humidity_2m}%`,
            },
            timestamp: weatherData.current.time
        };

        return NextResponse.json(formattedResponse);
    } catch (error) {
        console.error('Weather API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch weather data' },
            { status: 500 }
        );
    }
}
