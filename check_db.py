import sqlite3
import traceback

def check_db():
    print("Checking database...")
    try:
        conn = sqlite3.connect("entrenadores.db")
        cursor = conn.cursor()
        
        # Check if table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='entrenadores'")
        table = cursor.fetchone()
        if not table:
            print("Table 'entrenadores' does not exist!")
            return
            
        print("Table 'entrenadores' exists.")
        
        # Check columns
        cursor.execute("PRAGMA table_info(entrenadores)")
        columns = cursor.fetchall()
        print("Columns:")
        for col in columns:
            print(f" - {col[1]} ({col[2]})")
            
        # Try to add column if missing
        column_names = [c[1] for c in columns]
        if "victorias" not in column_names:
            print("Adding 'victorias' column...")
            try:
                cursor.execute("ALTER TABLE entrenadores ADD COLUMN victorias INTEGER DEFAULT 0")
                conn.commit()
                print("Added successfully!")
            except Exception as e:
                print(f"Error adding column: {e}")
                
        if "derrotas" not in column_names:
            print("Adding 'derrotas' column...")
            try:
                cursor.execute("ALTER TABLE entrenadores ADD COLUMN derrotas INTEGER DEFAULT 0")
                conn.commit()
                print("Added successfully!")
            except Exception as e:
                print(f"Error adding column: {e}")

        if "xp" not in column_names:
            try:
                cursor.execute("ALTER TABLE entrenadores ADD COLUMN xp INTEGER DEFAULT 0")
                conn.commit()
            except Exception as e:
                pass

        if "fecha_registro" not in column_names:
            try:
                cursor.execute("ALTER TABLE entrenadores ADD COLUMN fecha_registro VARCHAR DEFAULT ''")
                conn.commit()
            except Exception as e:
                pass
                
        conn.close()
    except Exception as e:
        print(f"Fatal error: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    check_db()
