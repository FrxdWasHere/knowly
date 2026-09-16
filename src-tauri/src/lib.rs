use std::time::Duration;

use tauri::Manager;
use tauri_plugin_shell::ShellExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let app_handle = app.handle().clone();

            tauri::async_runtime::spawn(async move {
                let resource_dir = match app_handle.path().resource_dir() {
                    Ok(path) => path,
                    Err(err) => {
                        eprintln!("Failed to get resource directory: {err}");
                        return;
                    }
                };

let server_path = resource_dir
    .join(".output")
    .join("server")
    .join("index.mjs");

let server_path = server_path
    .to_string_lossy()
    .trim_start_matches(r"\\?\")
    .to_string();

                println!("Starting Knowly server:");
                println!("{}", server_path);

                let sidecar = match app_handle.shell().sidecar("knowly-node") {
                    Ok(command) => command,
                    Err(err) => {
                        eprintln!("Failed to create Node sidecar command: {err}");
                        return;
                    }
                };

let (mut rx, _child) = match sidecar
    .args([server_path.as_str()])
    .env("HOST", "127.0.0.1")
    .env("PORT", "3000")
    .spawn()
{
    Ok(result) => result,
    Err(err) => {
        eprintln!("Failed to start Knowly server: {err}");
        return;
    }
};

tauri::async_runtime::spawn(async move {
    use tauri_plugin_shell::process::CommandEvent;

    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line) => {
                println!("[Knowly Node] {}", String::from_utf8_lossy(&line));
            }
            CommandEvent::Stderr(line) => {
                eprintln!("[Knowly Node ERROR] {}", String::from_utf8_lossy(&line));
            }
            CommandEvent::Terminated(payload) => {
                eprintln!("[Knowly Node] Process terminated: {:?}", payload);
                break;
            }
            _ => {}
        }
    }
});

                println!("Knowly server process started.");

                let mut ready = false;

                for attempt in 1..=100 {
                    match reqwest::get("http://127.0.0.1:3000").await {
                        Ok(response) if response.status().is_success() => {
                            println!(
                                "Knowly server is ready after {} attempts.",
                                attempt
                            );
                            ready = true;
                            break;
                        }
                        _ => {
                            tokio::time::sleep(Duration::from_millis(100)).await;
                        }
                    }
                }

                if !ready {
                    eprintln!("Knowly server failed to become ready.");
                    return;
                }

                if let Some(window) = app_handle.get_webview_window("main") {
                    println!("Navigating Knowly window to Nitro server...");

                    if let Err(err) =
                        window.navigate("http://127.0.0.1:3000".parse().unwrap())
                    {
                        eprintln!("Failed to navigate Knowly window: {err}");
                    }
                } else {
                    eprintln!("Could not find the main Knowly window.");
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}