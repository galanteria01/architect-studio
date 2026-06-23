use std::sync::Mutex;

use tauri::{Manager, RunEvent};
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_sql::{Migration, MigrationKind};

/// Holds the running AI sidecar process so we can terminate it on app exit.
#[derive(Default)]
struct SidecarProcess(Mutex<Option<CommandChild>>);

fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create_core_tables",
            sql: r#"
                CREATE TABLE IF NOT EXISTS projects (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    uuid TEXT NOT NULL UNIQUE,
                    name TEXT NOT NULL,
                    description TEXT NOT NULL DEFAULT '',
                    graph TEXT NOT NULL DEFAULT '{}',
                    thumbnail TEXT,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL
                );

                CREATE TABLE IF NOT EXISTS templates (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    key TEXT NOT NULL UNIQUE,
                    name TEXT NOT NULL,
                    category TEXT NOT NULL DEFAULT 'general',
                    description TEXT NOT NULL DEFAULT '',
                    graph TEXT NOT NULL DEFAULT '{}',
                    created_at INTEGER NOT NULL
                );

                CREATE TABLE IF NOT EXISTS component_favorites (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    component_type TEXT NOT NULL UNIQUE,
                    created_at INTEGER NOT NULL
                );

                CREATE TABLE IF NOT EXISTS simulations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_uuid TEXT NOT NULL,
                    params TEXT NOT NULL DEFAULT '{}',
                    results TEXT NOT NULL DEFAULT '{}',
                    created_at INTEGER NOT NULL
                );

                CREATE TABLE IF NOT EXISTS preferences (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                );
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "seed_default_preferences",
            sql: r#"
                INSERT OR IGNORE INTO preferences (key, value) VALUES ('theme', 'dark');
                INSERT OR IGNORE INTO preferences (key, value) VALUES ('ai_base_url', 'http://localhost:8008');
            "#,
            kind: MigrationKind::Up,
        },
    ]
}

/// Attempts to launch the bundled FastAPI sidecar. Failure is non-fatal: the
/// app still runs, AI features simply stay unavailable until the sidecar (or a
/// locally running `uvicorn`) is reachable.
fn spawn_ai_sidecar(app: &tauri::AppHandle) {
    let sidecar = match app.shell().sidecar("ai-server") {
        Ok(cmd) => cmd,
        Err(err) => {
            log::warn!("AI sidecar not configured/found: {err}. Start it manually with `npm run ai:dev`.");
            return;
        }
    };

    match sidecar.spawn() {
        Ok((mut rx, child)) => {
            if let Some(state) = app.try_state::<SidecarProcess>() {
                *state.0.lock().unwrap() = Some(child);
            }
            // Drain sidecar output so the pipe never blocks, and surface logs.
            tauri::async_runtime::spawn(async move {
                use tauri_plugin_shell::process::CommandEvent;
                while let Some(event) = rx.recv().await {
                    match event {
                        CommandEvent::Stdout(line) => {
                            log::info!("[ai-server] {}", String::from_utf8_lossy(&line).trim());
                        }
                        CommandEvent::Stderr(line) => {
                            log::info!("[ai-server] {}", String::from_utf8_lossy(&line).trim());
                        }
                        CommandEvent::Terminated(payload) => {
                            log::warn!("[ai-server] terminated: {:?}", payload.code);
                            break;
                        }
                        _ => {}
                    }
                }
            });
            log::info!("AI sidecar spawned.");
        }
        Err(err) => {
            log::warn!("Failed to spawn AI sidecar: {err}. Start it manually with `npm run ai:dev`.");
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:architect_studio.db", migrations())
                .build(),
        )
        .manage(SidecarProcess::default())
        .setup(|app| {
            spawn_ai_sidecar(app.handle());
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building Architect Studio");

    app.run(|app_handle, event| {
        if let RunEvent::Exit = event {
            if let Some(state) = app_handle.try_state::<SidecarProcess>() {
                if let Some(child) = state.0.lock().unwrap().take() {
                    let _ = child.kill();
                }
            }
        }
    });
}
