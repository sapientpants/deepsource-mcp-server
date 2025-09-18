#!/usr/bin/env node

/**
 * Script to fetch and update the GraphQL schema from DeepSource API
 *
 * Usage: node scripts/update-graphql-schema.js
 * or: pnpm schema:update
 */

import { writeFileSync } from 'fs';
import { getIntrospectionQuery, buildClientSchema, printSchema } from 'graphql';
import axios from 'axios';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEEPSOURCE_API_URL = 'https://api.deepsource.io/graphql/';
const SCHEMA_FILE_PATH = join(__dirname, '..', 'deepsource-api-schema.graphql');

async function updateSchema() {
  // eslint-disable-next-line no-console
  console.log('🔄 Fetching GraphQL schema from DeepSource API...');
  // eslint-disable-next-line no-console
  console.log(`   URL: ${DEEPSOURCE_API_URL}`);

  try {
    // Fetch the introspection query result
    const response = await axios.post(
      DEEPSOURCE_API_URL,
      {
        query: getIntrospectionQuery(),
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'deepsource-mcp-server/schema-updater',
        },
      }
    );

    const result = response.data;

    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors, null, 2)}`);
    }

    if (!result.data) {
      throw new Error('No data returned from introspection query');
    }

    // Build the client schema from introspection result
    const schema = buildClientSchema(result.data);

    // Convert to SDL (Schema Definition Language)
    const sdl = printSchema(schema);

    // Write to file
    writeFileSync(SCHEMA_FILE_PATH, sdl);

    // Calculate file size for logging
    const sizeKB = (sdl.length / 1024).toFixed(2);

    // eslint-disable-next-line no-console
    console.log(`✅ Schema updated successfully!`);
    // eslint-disable-next-line no-console
    console.log(`   File: ${SCHEMA_FILE_PATH}`);
    // eslint-disable-next-line no-console
    console.log(`   Size: ${sizeKB} KB`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Failed to update schema:', error.message);
    process.exit(1);
  }
}

// Run the update
updateSchema();
