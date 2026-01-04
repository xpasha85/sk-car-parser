import aiosqlite

DB_NAME = "history.db"

async def init_db():
    async with aiosqlite.connect(DB_NAME) as db:
        # Заменили username на destination_name
        await db.execute("""
            CREATE TABLE IF NOT EXISTS sent_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                batch_id TEXT,
                chat_id INTEGER,
                message_id INTEGER,
                destination_name TEXT, 
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await db.commit()

# Принимаем destination_name вместо username
async def save_message_ids(batch_id: str, chat_id: int, message_ids: list[int], destination_name: str):
    async with aiosqlite.connect(DB_NAME) as db:
        data = [(batch_id, chat_id, mid, destination_name) for mid in message_ids]
        await db.executemany(
            "INSERT INTO sent_messages (batch_id, chat_id, message_id, destination_name) VALUES (?, ?, ?, ?)",
            data
        )
        await db.commit()

async def get_messages_by_batch(batch_id: str):
    async with aiosqlite.connect(DB_NAME) as db:
        cursor = await db.execute(
            "SELECT chat_id, message_id FROM sent_messages WHERE batch_id = ?",
            (batch_id,)
        )
        return await cursor.fetchall()

async def get_all_messages():
    async with aiosqlite.connect(DB_NAME) as db:
        cursor = await db.execute("SELECT chat_id, message_id FROM sent_messages")
        return await cursor.fetchall()

async def delete_batch_record(batch_id: str):
    async with aiosqlite.connect(DB_NAME) as db:
        await db.execute("DELETE FROM sent_messages WHERE batch_id = ?", (batch_id,))
        await db.commit()

async def clear_database():
    async with aiosqlite.connect(DB_NAME) as db:
        await db.execute("DELETE FROM sent_messages")
        await db.commit()

async def get_all_batches():
    """Возвращает список партий + НАЗВАНИЕ КАНАЛА"""
    async with aiosqlite.connect(DB_NAME) as db:
        # Группируем и берем destination_name
        sql = """
            SELECT batch_id, created_at, MAX(destination_name) as destination_name, COUNT(message_id) as msg_count 
            FROM sent_messages 
            GROUP BY batch_id 
            ORDER BY created_at DESC
            LIMIT 50
        """
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(sql)
        rows = await cursor.fetchall()
        
        return [
            {
                "batch_id": row["batch_id"],
                "created_at": row["created_at"],
                "destination_name": row["destination_name"] or "Unknown Chat",
                "count": row["msg_count"]
            }
            for row in rows
        ]