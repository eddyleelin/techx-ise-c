"use client";
import { useState, useEffect, useCallback } from "react";
import dynamic from 'next/dynamic';

const MapComponent = dynamic(
  () => import('../components/Map'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
) as React.ComponentType<{ onLocationSelect: (lat: number, lng: number) => void; initialLocation?: { latitude: number; longitude: number } }>;

interface WeatherData {
  temperature: string;
  wind_speed: string;
  humidity: string;
}

interface LocationData {
  coordinates: {
    latitude: number;
    longitude: number;
  };
  city: string;
  display_name: string;
}

export default function Home() {
  const [name, setName] = useState("");
  const [greeting, setGreeting] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [locationError, setLocationError] = useState<string>("");
  const [backgroundImage, setBackgroundImage] = useState<string>("");
  const fetchPlacePhoto = async (latitude: number, longitude: number) => {
    console.log('[Frontend] Fetching place photo for coordinates:', latitude, longitude);
    try {
      // First get the place ID from our places API
      const placesResponse = await fetch(`/api/places?lat=${latitude}&lng=${longitude}`);
      const placesData = await placesResponse.json();

      // If we get a place ID, try to fetch the photo
      if (placesResponse.ok && placesData.placeId) {
        console.log('[Frontend] Found place:', placesData);

        const response = await fetch(`/api/images?placeId=${placesData.placeId}`);
        if (response.ok) {
          const data = await response.json();
          console.log('[Frontend] Received photo data:', data);
          setBackgroundImage(data.photoUrl);
        } else {
          console.log('[Frontend] No photo available for place');
          setBackgroundImage("");
        }
      } else {
        console.log('[Frontend] No place found at this location');
        setBackgroundImage("");
      }
    } catch (error) {
      console.error("[Frontend] Error fetching place photo:", error);
      // Don't show error to user, just fallback to gradient background
      setBackgroundImage("");
    }
  };

  const fetchWeatherData = async (latitude: number, longitude: number) => {
    try {
      const weatherResponse = await fetch(`/api/weather?lat=${latitude}&lon=${longitude}`);
      if (!weatherResponse.ok) {
        const errorData = await weatherResponse.json();
        console.error('Weather API error:', errorData);
        throw new Error(errorData.error || 'Failed to fetch weather data');
      }

      const data = await weatherResponse.json();
      setLocationData(data.location);
      setWeatherData(data.weather);
      setLocationError("");

      // Fetch photo for the new location
      fetchPlacePhoto(latitude, longitude);
    } catch (error) {
      console.error('Error fetching weather:', error);
      setLocationError("Failed to fetch weather data");
    }
  };

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          fetchWeatherData(latitude, longitude);
        },
        (error) => {
          console.error('Geolocation error:', error);
          setLocationError("Please enable location access to see weather information");
          // Clear background image on error
          setBackgroundImage("");
        }
      );
    } else {
      setLocationError("Geolocation is not supported by your browser");
      // Clear background image if geolocation not supported
      setBackgroundImage("");
    }
  }, []);

  const handleMapClick = (lat: number, lng: number) => {
    fetchWeatherData(lat, lng);
  };

  const generateGreeting = useCallback(
    async (shouldDebounce = true) => {
      if (!weatherData || !locationData || !name.trim()) return;

      // Prevent rapid-fire API calls
      if (shouldDebounce && isLoading) return;

      setIsLoading(true);
      setIsTransitioning(true);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            weather: weatherData,
            location: locationData
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to get AI response');
        }

        const data = await response.json();

        // Smooth transition for greeting changes
        setIsTransitioning(true);
        setTimeout(() => {
          setGreeting(data.message);
          setIsTransitioning(false);
        }, 150);

      } catch (error) {
        console.error('Error:', error);
        // More informative fallback greeting
        const fallbackGreeting = `Welcome to ${locationData.city}, ${name}! It's ${weatherData.temperature} outside.`;
        setGreeting(fallbackGreeting);
        setIsTransitioning(false);
      } finally {
        setIsLoading(false);
      }
    },
    [weatherData, locationData, name, isLoading]
  );

  // Debounced effect for greeting generation
  useEffect(() => {
    if (locationData && weatherData && name.trim()) {
      const debounceTimer = setTimeout(() => {
        generateGreeting(true);
      }, 500); // 500ms debounce

      return () => clearTimeout(debounceTimer);
    }
  }, [locationData, name, weatherData]);

  return (
    <main
      className="min-h-screen flex flex-col items-center p-8 relative"
      style={{
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : "linear-gradient(to bottom right, rgb(219 234 254), rgb(224 242 254), rgb(224 231 255))",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      }}
    >
      {/* Semi-transparent overlay for better readability */}
      <div className="absolute inset-0 bg-white/60 backdrop-blur-sm" />
      {/* Content container with relative positioning to appear above overlay */}
      <div className="relative z-10 w-full max-w-4xl space-y-8">
        <h1 className="text-4xl font-bold text-center bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 text-transparent bg-clip-text">
          Interactive Weather Greeter
        </h1>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 space-y-6">
          {locationError ? (
            <p className="text-red-500 text-center">{locationError}</p>
          ) : (
            <div className="space-y-6">
              {/* Location Information */}
              <div className="text-center space-y-2">
                {locationData ? (
                  <>
                    <h2 className="text-2xl font-semibold text-gray-800">
                      {locationData.city}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {locationData.display_name}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {locationData.coordinates.latitude.toFixed(4)}°N, {locationData.coordinates.longitude.toFixed(4)}°E
                    </p>
                  </>
                ) : (
                  <>
                    <div className="h-8 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4 mx-auto mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2 mx-auto"></div>
                  </>
                )}
              </div>

              {/* Weather Information */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-blue-50 rounded-xl p-4">
                  {weatherData ? (
                    <>
                      <p className="text-2xl font-bold text-blue-600">{weatherData.temperature}</p>
                      <p className="text-sm text-gray-600">Temperature</p>
                    </>
                  ) : (
                    <>
                      <div className="h-8 bg-blue-200/50 rounded animate-pulse mb-2"></div>
                      <div className="h-4 bg-blue-200/50 rounded animate-pulse w-3/4 mx-auto"></div>
                    </>
                  )}
                </div>
                <div className="bg-sky-50 rounded-xl p-4">
                  {weatherData ? (
                    <>
                      <p className="text-2xl font-bold text-sky-600">{weatherData.wind_speed}</p>
                      <p className="text-sm text-gray-600">Wind Speed</p>
                    </>
                  ) : (
                    <>
                      <div className="h-8 bg-sky-200/50 rounded animate-pulse mb-2"></div>
                      <div className="h-4 bg-sky-200/50 rounded animate-pulse w-3/4 mx-auto"></div>
                    </>
                  )}
                </div>
                <div className="bg-indigo-50 rounded-xl p-4">
                  {weatherData ? (
                    <>
                      <p className="text-2xl font-bold text-indigo-600">{weatherData.humidity}</p>
                      <p className="text-sm text-gray-600">Humidity</p>
                    </>
                  ) : (
                    <>
                      <div className="h-8 bg-indigo-200/50 rounded animate-pulse mb-2"></div>
                      <div className="h-4 bg-indigo-200/50 rounded animate-pulse w-3/4 mx-auto"></div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-center gap-4">
                <div className="flex w-full max-w-md gap-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        generateGreeting(false);
                      }
                    }}
                    placeholder="Enter your name"
                    className="flex-1 px-4 py-2 border-2 border-blue-200 rounded-lg bg-white/50 backdrop-blur-sm focus:border-blue-400 focus:outline-none transition-colors"
                  />
                  <button
                    onClick={() => generateGreeting(false)}
                    disabled={isLoading || !name.trim()}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 via-sky-500 to-indigo-500 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <span className="inline-flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending...
                      </span>
                    ) : (
                      'Send'
                    )}
                  </button>
                </div>

                {greeting && (
                  <div className={`text-center relative transition-opacity duration-150 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
                    <p className="text-2xl px-6 py-3 rounded-lg inline-block bg-gradient-to-r from-blue-500 via-sky-500 to-indigo-500 text-white shadow-lg">
                      {isLoading ? (
                        <span className="inline-flex items-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Generating greeting...
                        </span>
                      ) : greeting}
                      <button
                        onClick={() => generateGreeting(false)}
                        disabled={isLoading}
                        className="ml-3 hover:scale-110 transition-transform disabled:opacity-50"
                        title="Refresh greeting"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-[400px] rounded-2xl overflow-hidden shadow-xl">
          <MapComponent onLocationSelect={handleMapClick} initialLocation={locationData?.coordinates} />
        </div>

        <p className="text-center text-sm text-gray-500">
          Click anywhere on the map to update the weather location
        </p>
      </div>
    </main>
  );
}
