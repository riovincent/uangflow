import {sqliteTable,text,integer,primaryKey} from 'drizzle-orm/sqlite-core';
export const records=sqliteTable('records',{
  userId:text('user_id').primaryKey(),
  state:text('state').notNull(),
  revision:integer('revision').notNull().default(0),
  updatedAt:text('updated_at').notNull(),
});
export const danaDevices=sqliteTable('dana_devices',{
  userId:text('user_id').primaryKey(),tokenHash:text('token_hash').notNull().unique(),
  createdAt:text('created_at').notNull(),lastSeen:text('last_seen'),
});
export const danaEvents=sqliteTable('dana_events',{
  userId:text('user_id').notNull(),eventId:text('event_id').notNull(),
  date:text('date').notNull(),message:text('message').notNull(),
  status:text('status').notNull(),receivedAt:text('received_at').notNull(),
},table=>[primaryKey({columns:[table.userId,table.eventId]})]);
