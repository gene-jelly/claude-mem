/**
 * Sync Routes
 *
 * Handles on-demand synchronization of observations to ChromaDB.
 * Used by MemoryBench to trigger embedding for benchmark observations.
 */

import express, { Request, Response } from 'express';
import { BaseRouteHandler } from '../BaseRouteHandler.js';
import { logger } from '../../../../utils/logger.js';
import { SessionStore } from '../../../sqlite/SessionStore.js';
import { ChromaSync } from '../../../sync/ChromaSync.js';

interface SyncObservationsBody {
  ids: number[];
}

export class SyncRoutes extends BaseRouteHandler {
  constructor(
    private sessionStore: SessionStore,
    private chromaSync: ChromaSync
  ) {
    super();
  }

  setupRoutes(app: express.Application): void {
    app.post('/api/sync/observations', this.handleSyncObservations.bind(this));
  }

  /**
   * Sync specific observations to ChromaDB
   * POST /api/sync/observations
   * Body: { ids: number[] }
   */
  private handleSyncObservations = this.wrapHandler(async (req: Request, res: Response): Promise<void> => {
    const { ids } = req.body as SyncObservationsBody;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      this.badRequest(res, 'ids array is required');
      return;
    }

    logger.info('SYNC', `Syncing ${ids.length} observations to ChromaDB`, { ids: ids.slice(0, 5) });

    try {
      // Fetch observations from SQLite
      const observations = this.sessionStore.getObservationsByIds(ids, {});

      if (observations.length === 0) {
        res.json({ success: true, embeddedCount: 0, message: 'No observations found for given IDs' });
        return;
      }

      // Convert to StoredObservation format expected by ChromaSync
      const storedObservations = observations.map(obs => ({
        id: obs.id,
        memory_session_id: obs.memory_session_id,
        project: obs.project,
        text: null,
        type: obs.type,
        title: obs.title,
        subtitle: obs.subtitle,
        facts: typeof obs.facts === 'string' ? obs.facts : JSON.stringify(obs.facts || []),
        narrative: obs.narrative,
        concepts: typeof obs.concepts === 'string' ? obs.concepts : JSON.stringify(obs.concepts || []),
        files_read: typeof obs.files_read === 'string' ? obs.files_read : JSON.stringify(obs.files_read || []),
        files_modified: typeof obs.files_modified === 'string' ? obs.files_modified : JSON.stringify(obs.files_modified || []),
        prompt_number: obs.prompt_number || 0,
        discovery_tokens: obs.discovery_tokens || 0,
        created_at: obs.created_at,
        created_at_epoch: obs.created_at_epoch
      }));

      // Sync observations to Chroma
      const embeddedCount = await this.chromaSync.syncStoredObservations(storedObservations);

      logger.info('SYNC', `Synced ${embeddedCount}/${observations.length} observations`);
      res.json({ success: true, embeddedCount });

    } catch (e: any) {
      logger.error('SYNC', 'Failed to sync observations', { error: e.message });
      this.serverError(res, `Sync failed: ${e.message}`);
    }
  });
}
