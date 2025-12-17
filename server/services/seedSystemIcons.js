/**
 * System Icons Seeding Service
 * 
 * Seeds bundled system icons (integration logos) on server startup.
 * System icons are stored in server/assets/system-icons/ and copied to
 * the custom-icons upload directory with is_system = 1.
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const customIconsDB = require('../db/customIcons');

// Bundled system icons directory (shipped with server)
const BUNDLED_ICONS_DIR = path.join(__dirname, '../assets/system-icons');

// Target directory for icons (same as user uploads)
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
const TARGET_ICONS_DIR = path.join(DATA_DIR, 'upload/custom-icons');

/**
 * System icons configuration
 * Each entry maps a stable ID to the icon file and display name
 */
const SYSTEM_ICONS = [
    {
        id: 'system-overseerr',
        filename: 'overseerr.png',
        name: 'Overseerr',
        mimeType: 'image/png'
    },
    {
        id: 'system-radarr',
        filename: 'radarr.png',
        name: 'Radarr',
        mimeType: 'image/png'
    },
    {
        id: 'system-sonarr',
        filename: 'sonarr.png',
        name: 'Sonarr',
        mimeType: 'image/png'
    },
    {
        id: 'system-lidarr',
        filename: 'lidarr.png',
        name: 'Lidarr',
        mimeType: 'image/png'
    },
    {
        id: 'system-prowlarr',
        filename: 'prowlarr.png',
        name: 'Prowlarr',
        mimeType: 'image/png'
    },
    {
        id: 'system-plex',
        filename: 'plex.png',
        name: 'Plex',
        mimeType: 'image/png'
    },
    {
        id: 'system-tautulli',
        filename: 'tautulli.png',
        name: 'Tautulli',
        mimeType: 'image/png'
    },
    {
        id: 'system-qbittorrent',
        filename: 'qbittorrent.png',
        name: 'qBittorrent',
        mimeType: 'image/png'
    },
    {
        id: 'system-homeassistant',
        filename: 'homeassistant.png',
        name: 'Home Assistant',
        mimeType: 'image/png'
    }
];

/**
 * Seed system icons on server startup
 * Copies bundled icons to upload directory and registers in database
 */
async function seedSystemIcons() {
    logger.info('[SystemIcons] Checking for system icons to seed...');

    // Ensure bundled icons directory exists
    if (!fs.existsSync(BUNDLED_ICONS_DIR)) {
        logger.debug('[SystemIcons] No bundled icons directory found, skipping');
        return;
    }

    // Ensure target directory exists
    if (!fs.existsSync(TARGET_ICONS_DIR)) {
        fs.mkdirSync(TARGET_ICONS_DIR, { recursive: true });
    }

    let seededCount = 0;

    for (const iconConfig of SYSTEM_ICONS) {
        const sourcePath = path.join(BUNDLED_ICONS_DIR, iconConfig.filename);
        const targetFilename = `system-${iconConfig.filename}`;
        const targetPath = path.join(TARGET_ICONS_DIR, targetFilename);

        // Skip if source file doesn't exist
        if (!fs.existsSync(sourcePath)) {
            logger.debug(`[SystemIcons] Source file not found: ${iconConfig.filename}`);
            continue;
        }

        // Copy file if not already in target directory
        if (!fs.existsSync(targetPath)) {
            try {
                fs.copyFileSync(sourcePath, targetPath);
                logger.info(`[SystemIcons] Copied ${iconConfig.filename} to upload directory`);
            } catch (copyError) {
                logger.error(`[SystemIcons] Failed to copy ${iconConfig.filename}`, { error: copyError.message });
                continue;
            }
        }

        // Add to database if not already exists
        try {
            const result = await customIconsDB.addSystemIcon({
                id: iconConfig.id,
                name: iconConfig.name,
                filePath: targetFilename,
                mimeType: iconConfig.mimeType
            });

            if (result) {
                seededCount++;
            }
        } catch (dbError) {
            logger.error(`[SystemIcons] Failed to register ${iconConfig.name} in database`, { error: dbError.message });
        }
    }

    if (seededCount > 0) {
        logger.info(`[SystemIcons] Seeded ${seededCount} system icons`);
    } else {
        logger.debug('[SystemIcons] All system icons already present');
    }
}

/**
 * Get the icon ID for a service (for use in notifications)
 * @param {string} service - Service name (e.g., 'overseerr', 'radarr', 'sonarr')
 * @returns {string|null} System icon ID or null
 */
function getSystemIconIdForService(service) {
    const serviceMap = {
        'overseerr': 'system-overseerr',
        'radarr': 'system-radarr',
        'sonarr': 'system-sonarr',
        'lidarr': 'system-lidarr',
        'prowlarr': 'system-prowlarr',
        'plex': 'system-plex',
        'tautulli': 'system-tautulli',
        'qbittorrent': 'system-qbittorrent',
        'homeassistant': 'system-homeassistant',
        'home-assistant': 'system-homeassistant'
    };
    return serviceMap[service.toLowerCase()] || null;
}

module.exports = {
    seedSystemIcons,
    getSystemIconIdForService,
    SYSTEM_ICONS
};
