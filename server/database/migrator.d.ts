/**
 * Type declarations for migrator.js
 */
import type { Database } from 'better-sqlite3';

export interface MigrationStatus {
    needsMigration: boolean;
    currentVersion: number;
    expectedVersion: number;
    isDowngrade: boolean;
}

export interface MigrationResult {
    success: boolean;
    migratedFrom?: number;
    migratedTo?: number;
    error?: string;
}

export interface Migration {
    version: number;
    name: string;
    up: (db: Database) => void;
}

export interface BackupInfo {
    path: string;
    filename: string;
    date: Date;
    size: number;
}

export function getCurrentVersion(db: Database): number;
export function setVersion(db: Database, version: number): void;
export function getExpectedVersion(): number;
export function loadMigrations(): Migration[];
export function getPendingMigrations(db: Database): Migration[];
export function checkMigrationStatus(db: Database): MigrationStatus;
export function runMigrations(db: Database): MigrationResult;
export function createBackup(): string | null;
export function restoreFromBackup(backupPath: string): boolean;
export function listBackups(): BackupInfo[];
export const BACKUP_DIR: string;
