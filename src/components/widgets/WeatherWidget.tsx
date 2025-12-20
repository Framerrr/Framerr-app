import React, { useState, useEffect, useRef } from 'react';
import {
    Sun,
    Cloud,
    CloudFog,
    CloudRain,
    CloudSnow,
    CloudLightning,
    CloudOff,
    MapPin,
    LucideIcon
} from 'lucide-react';
import logger from '../../utils/logger';

interface WeatherData {
    temp: number;
    code: number;
    high: number;
    low: number;
    location: string;
}

interface WeatherInfo {
    label: string;
    icon: LucideIcon;
}

interface OpenMeteoResponse {
    current: {
        temperature_2m: number;
        weather_code: number;
    };
    daily: {
        temperature_2m_max: number[];
        temperature_2m_min: number[];
    };
}

interface LocationResponse {
    locality?: string;
    principalSubdivision?: string;
    principalSubdivisionCode?: string;
    city?: string;
}

const WeatherWidget = (): React.JSX.Element | null => {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isWide, setIsWide] = useState<boolean>(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Detect container width for responsive layout
    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                // Switch to horizontal layout if width >= 410px
                const shouldBeWide = entry.contentRect.width >= 410;
                setIsWide(prev => prev === shouldBeWide ? prev : shouldBeWide);
            }
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // WMO Weather interpretation codes (https://open-meteo.com/en/docs)
    const getWeatherInfo = (code: number): WeatherInfo => {
        if (code === 0) return { label: 'Clear', icon: Sun };
        if (code === 1 || code === 2 || code === 3) return { label: 'Partly Cloudy', icon: Cloud };
        if (code >= 45 && code <= 48) return { label: 'Fog', icon: CloudFog || Cloud };
        if (code >= 51 && code <= 67) return { label: 'Rain', icon: CloudRain };
        if (code >= 71 && code <= 77) return { label: 'Snow', icon: CloudSnow };
        if (code >= 80 && code <= 82) return { label: 'Showers', icon: CloudRain };
        if (code >= 85 && code <= 86) return { label: 'Snow Showers', icon: CloudSnow };
        if (code >= 95 && code <= 99) return { label: 'Thunderstorm', icon: CloudLightning };
        return { label: 'Unknown', icon: Cloud };
    };

    useEffect(() => {
        if (!navigator.geolocation) {
            setError('Geolocation not supported');
            setLoading(false);
            return;
        }

        const success = async (position: GeolocationPosition): Promise<void> => {
            try {
                const { latitude, longitude } = position.coords;

                // Parallel fetch for weather and location name
                const [weatherRes, locationRes] = await Promise.all([
                    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=auto`),
                    fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`)
                ]);

                if (!weatherRes.ok) throw new Error('Weather data fetch failed');

                const weatherData: OpenMeteoResponse = await weatherRes.json();
                const locationData: LocationResponse = await locationRes.json();

                // Construct location string
                let locationStr = 'Unknown Location';
                if (locationData.locality && locationData.principalSubdivision) {
                    locationStr = `${locationData.locality}, ${locationData.principalSubdivisionCode || locationData.principalSubdivision}`;
                } else if (locationData.city) {
                    locationStr = locationData.city;
                } else if (locationData.locality) {
                    locationStr = locationData.locality;
                }

                setWeather({
                    temp: Math.round(weatherData.current.temperature_2m),
                    code: weatherData.current.weather_code,
                    high: Math.round(weatherData.daily.temperature_2m_max[0]),
                    low: Math.round(weatherData.daily.temperature_2m_min[0]),
                    location: locationStr
                });
                setError(null);
            } catch (err) {
                logger.error('Weather fetch error:', { error: err });
                setError('Failed to load weather');
            } finally {
                setLoading(false);
            }
        };

        const fail = (err: GeolocationPositionError): void => {
            logger.error('Geolocation error:', { error: err.message });
            setError('Location access denied');
            setLoading(false);
        };

        navigator.geolocation.getCurrentPosition(success, fail, {
            timeout: 10000,
            maximumAge: 60000
        });
    }, []);

    // Render loading state
    if (loading) {
        return (
            <div ref={containerRef} className="relative flex items-center justify-center h-full p-4">
                <div style={{ color: 'var(--text-secondary)' }}>Loading weather...</div>
            </div>
        );
    }

    // Render error state
    if (error) {
        return (
            <div ref={containerRef} className="relative flex items-center justify-center h-full p-4">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <CloudOff size={24} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                    {error}
                </div>
            </div>
        );
    }

    if (!weather) return null;

    const info = getWeatherInfo(weather.code);
    const WeatherIcon = info.icon || Cloud;

    // Render success state with weather data
    return (
        <div ref={containerRef} className="relative flex items-center justify-center h-full p-4">
            {isWide ? (
                // Horizontal layout
                <div className="flex items-center gap-5">
                    {/* Icon */}
                    <WeatherIcon size={48} className="text-theme-secondary opacity-80 flex-shrink-0" />

                    {/* Temperature */}
                    <div className="text-5xl font-bold text-theme-primary leading-none">
                        {weather.temp}°
                    </div>

                    {/* Info Column */}
                    <div className="flex flex-col items-start">
                        <div className="flex items-center gap-1 text-sm text-theme-secondary">
                            <MapPin size={12} className="flex-shrink-0" />
                            <span>{weather.location}</span>
                        </div>
                        <div className="text-theme-secondary font-medium mt-0.5">{info.label}</div>
                        <div className="text-xs text-theme-tertiary mt-0.5">
                            H: {weather.high}° · L: {weather.low}°
                        </div>
                    </div>
                </div>
            ) : (
                // Vertical layout - centered
                <div className="flex flex-col items-center text-center">
                    {/* Location */}
                    <div className="flex items-center gap-1 text-xs text-theme-secondary mb-2">
                        <MapPin size={10} className="flex-shrink-0" />
                        <span className="text-center">{weather.location}</span>
                    </div>

                    {/* Temp + Icon row */}
                    <div className="flex items-center gap-3">
                        <div className="text-5xl font-bold text-theme-primary leading-none">
                            {weather.temp}°
                        </div>
                        <WeatherIcon size={36} className="text-theme-secondary opacity-70" />
                    </div>

                    {/* Conditions */}
                    <div className="text-theme-secondary font-medium mt-2">{info.label}</div>
                    <div className="text-xs text-theme-tertiary mt-1">
                        H: {weather.high}° · L: {weather.low}°
                    </div>
                </div>
            )}
        </div>
    );
};

export default WeatherWidget;
