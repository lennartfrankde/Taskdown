// Health check endpoint for Coolify deployment
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    services: {
      database: process.env.DATABASE_TYPE || 'none',
      redis: process.env.REDIS_URL ? 'connected' : 'not configured',
      litellm: process.env.LITELLM_URL ? 'available' : 'not configured',
      qdrant: process.env.QDRANT_URL ? 'available' : 'not configured'
    }
  };

  return json(health);
};