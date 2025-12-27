import React from 'react';
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
import './WeatherWidget.css';

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
    const [weather, setWeather] = React.useState<WeatherData | null>(null);
    const [loading, setLoading] = React.useState<boolean>(true);
    const [error, setError] = React.useState<string | null>(null);

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

    React.useEffect(() => {
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
            <div className="weather-widget weather-widget--loading">
                <span className="weather-widget__loading-text">Loading weather...</span>
            </div>
        );
    }

    // Render error state
    if (error) {
        return (
            <div className="weather-widget weather-widget--error">
                <CloudOff className="weather-widget__error-icon" />
                <span className="weather-widget__error-text">{error}</span>
            </div>
        );
    }

    if (!weather) return null;

    const info = getWeatherInfo(weather.code);
    const WeatherIcon = info.icon || Cloud;

    // Render success state - CSS container queries handle all responsive layouts
    return (
        <div className="weather-widget">
            <div className="weather-widget__content">
                {/* Weather Icon */}
                <WeatherIcon className="weather-widget__icon" />

                {/* Temperature */}
                <div className="weather-widget__temp">
                    {weather.temp}°
                </div>

                {/* Info Section */}
                <div className="weather-widget__info">
                    <div className="weather-widget__location">
                        <MapPin className="weather-widget__location-icon" />
                        <span>{weather.location}</span>
                    </div>
                    <div className="weather-widget__condition">{info.label}</div>
                    <div className="weather-widget__highlow">
                        H: {weather.high}° · L: {weather.low}°
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WeatherWidget;
