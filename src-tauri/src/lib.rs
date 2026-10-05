use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;
use tauri::{Emitter, Manager};

#[derive(Serialize, Deserialize, Clone)]
pub struct FileOpenResult {
  pub name: String,
  pub path: String,
  pub content: String,
  pub modified: u64,
}

#[derive(Serialize, Deserialize)]
pub struct FileSaveResult {
  pub name: String,
  pub path: String,
  pub modified: u64,
}

// Base64 encoder without external dependencies
fn base64_encode(data: &[u8]) -> String {
  const CHARSET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let mut result = String::with_capacity(data.len() * 4 / 3 + 4);
  let mut i = 0;
  while i < data.len() {
    let b0 = data[i];
    let b1 = if i + 1 < data.len() { data[i + 1] } else { 0 };
    let b2 = if i + 2 < data.len() { data[i + 2] } else { 0 };

    result.push(CHARSET[(b0 >> 2) as usize] as char);
    result.push(CHARSET[(((b0 & 0x03) << 4) | (b1 >> 4)) as usize] as char);

    if i + 1 < data.len() {
      result.push(CHARSET[(((b1 & 0x0F) << 2) | (b2 >> 6)) as usize] as char);
    } else {
      result.push('=');
    }

    if i + 2 < data.len() {
      result.push(CHARSET[(b2 & 0x3F) as usize] as char);
    } else {
      result.push('=');
    }
    i += 3;
  }
  result
}

#[tauri::command]
fn read_image_data_url(path: String) -> Result<String, String> {
  let clean_raw = path.trim();
  let decoded_str = decode_uri(clean_raw);
  
  // Clean Windows drive prefix if formatted like "/D:/..." or "\D:\..."
  let clean_decoded = if decoded_str.starts_with('/') || decoded_str.starts_with('\\') {
    if decoded_str.len() >= 3 && decoded_str.chars().nth(2) == Some(':') {
      decoded_str[1..].to_string()
    } else {
      decoded_str
    }
  } else {
    decoded_str
  };

  let file_path = Path::new(&clean_decoded);
  let resolved_path = if file_path.exists() && file_path.is_file() {
    file_path.to_path_buf()
  } else {
    let raw_path = Path::new(clean_raw);
    if raw_path.exists() && raw_path.is_file() {
      raw_path.to_path_buf()
    } else {
      return Err(format!("File not found: {}", path));
    }
  };

  let ext = resolved_path
    .extension()
    .and_then(|e| e.to_str())
    .unwrap_or("png")
    .to_lowercase();

  let mime_type = match ext.as_str() {
    "jpg" | "jpeg" => "image/jpeg",
    "png" => "image/png",
    "gif" => "image/gif",
    "webp" => "image/webp",
    "svg" => "image/svg+xml",
    "bmp" => "image/bmp",
    "ico" => "image/x-icon",
    "avif" => "image/avif",
    "tiff" | "tif" => "image/tiff",
    _ => "image/png",
  };

  let data = fs::read(&resolved_path).map_err(|e| e.to_string())?;
  let base64_str = base64_encode(&data);
  Ok(format!("data:{};base64,{}", mime_type, base64_str))
}

// Percent-decoding helper for URIs (e.g. "Pasted%20image%202026.png" -> "Pasted image 2026.png")
fn decode_uri(input: &str) -> String {
  let mut bytes = Vec::new();
  let mut chars = input.bytes();
  while let Some(b) = chars.next() {
    if b == b'%' {
      let h1 = chars.next();
      let h2 = chars.next();
      if let (Some(h1), Some(h2)) = (h1, h2) {
        if let Ok(byte) = u8::from_str_radix(
          &format!("{}{}", h1 as char, h2 as char),
          16,
        ) {
          bytes.push(byte);
          continue;
        }
      }
    }
    bytes.push(b);
  }
  String::from_utf8(bytes).unwrap_or_else(|_| input.to_string())
}

// Recursive file search inside a directory with depth limit
fn find_file_recursive(dir: &Path, filename: &str, current_depth: usize, max_depth: usize) -> Option<PathBuf> {
  if current_depth > max_depth {
    return None;
  }
  if let Ok(entries) = fs::read_dir(dir) {
    let mut subdirs = Vec::new();
    for entry in entries.flatten() {
      let file_type = entry.file_type().ok();
      let path = entry.path();
      let name = entry.file_name().to_string_lossy().to_string();

      // Skip hidden directories and system folders
      if name.starts_with('.')
        || name.eq_ignore_ascii_case("node_modules")
        || name.eq_ignore_ascii_case("$RECYCLE.BIN")
        || name.eq_ignore_ascii_case(".trash")
      {
        continue;
      }

      if let Some(ft) = file_type {
        if ft.is_file() {
          if name.eq_ignore_ascii_case(filename) {
            return Some(path);
          }
        } else if ft.is_dir() {
          subdirs.push(path);
        }
      }
    }

    for subdir in subdirs {
      if let Some(found) = find_file_recursive(&subdir, filename, current_depth + 1, max_depth) {
        return Some(found);
      }
    }
  }
  None
}

fn normalize_path_str(p: &Path) -> String {
  let s = p.to_string_lossy().to_string();
  #[cfg(windows)]
  {
    s.replace('/', "\\")
  }
  #[cfg(not(windows))]
  {
    s
  }
}

#[tauri::command]
fn resolve_image_path(
  base_file_path: Option<String>,
  image_src: String,
  hint_folders: Option<Vec<String>>,
) -> Option<String> {
  let clean_src_raw = image_src.trim();
  let clean_src = decode_uri(clean_src_raw);
  let src_path = Path::new(&clean_src);

  // 1. If absolute path exists
  if src_path.is_absolute() && src_path.exists() {
    return Some(normalize_path_str(src_path));
  }

  // Common subdirectories in Obsidian and markdown projects
  let common_subdirs = [
    "",
    "attachments",
    "attachment",
    "_attachments",
    "assets",
    "asset",
    "_assets",
    "images",
    "image",
    "img",
    "files",
    "file",
    "_resources",
    "resources",
    "media",
    "pasted_images",
    "pasted",
    "99_Attachments",
    "99-Attachments",
    "static",
    "public",
  ];

  let filename_only = src_path
    .file_name()
    .and_then(|n| n.to_str())
    .unwrap_or(&clean_src);

  // 2. Check hint_folders if provided (e.g. recent files, open tabs, last picked image folder)
  if let Some(ref hints) = hint_folders {
    for hint in hints {
      let hint_dir = Path::new(hint.trim());
      if hint_dir.exists() {
        let dir_to_check = if hint_dir.is_file() {
          hint_dir.parent().unwrap_or(hint_dir)
        } else {
          hint_dir
        };

        let mut curr_hint = dir_to_check.to_path_buf();
        for _ in 0..5 {
          // Check .obsidian/app.json inside curr_hint
          let obsidian_dir = curr_hint.join(".obsidian");
          if obsidian_dir.exists() && obsidian_dir.is_dir() {
            let app_json_path = obsidian_dir.join("app.json");
            if let Ok(app_json_content) = fs::read_to_string(&app_json_path) {
              if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&app_json_content) {
                if let Some(folder) = parsed.get("attachmentFolderPath").and_then(|v| v.as_str()) {
                  let folder_clean = folder.trim();
                  let candidate = if folder_clean == "/" || folder_clean.is_empty() {
                    curr_hint.join(&clean_src)
                  } else if folder_clean.starts_with("./") {
                    let rel_sub = folder_clean.trim_start_matches("./");
                    dir_to_check.join(rel_sub).join(&clean_src)
                  } else {
                    curr_hint.join(folder_clean).join(&clean_src)
                  };
                  if candidate.exists() && candidate.is_file() {
                    return Some(normalize_path_str(&candidate));
                  }
                }
              }
            }
          }

          for subdir in &common_subdirs {
            let target = if subdir.is_empty() {
              curr_hint.join(&clean_src)
            } else {
              curr_hint.join(subdir).join(&clean_src)
            };
            if target.exists() && target.is_file() {
              return Some(normalize_path_str(&target));
            }
          }

          if let Some(found) = find_file_recursive(&curr_hint, filename_only, 0, 4) {
            return Some(normalize_path_str(&found));
          }

          if let Some(parent) = curr_hint.parent() {
            curr_hint = parent.to_path_buf();
          } else {
            break;
          }
        }
      }
    }
  }

  let current_fallback = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
  let base_dir = match base_file_path {
    Some(ref p) if !p.trim().is_empty() => {
      let base_doc_path = Path::new(p.trim());
      if base_doc_path.is_file() {
        base_doc_path.parent().unwrap_or(base_doc_path).to_path_buf()
      } else {
        base_doc_path.to_path_buf()
      }
    }
    _ => current_fallback,
  };

  // 3. Direct checks in note's current directory & immediate subdirectories
  for subdir in &common_subdirs {
    let target = if subdir.is_empty() {
      base_dir.join(&clean_src)
    } else {
      base_dir.join(subdir).join(&clean_src)
    };
    if target.exists() && target.is_file() {
      return Some(normalize_path_str(&target));
    }
  }

  // 4. Walk up the directory hierarchy to find Obsidian Vault Root (.obsidian) or parent folders
  let mut curr_dir = base_dir.to_path_buf();
  let mut vault_root: Option<PathBuf> = None;

  for _ in 0..10 {
    let obsidian_dir = curr_dir.join(".obsidian");
    if obsidian_dir.exists() && obsidian_dir.is_dir() {
      vault_root = Some(curr_dir.clone());

      // Try reading .obsidian/app.json for "attachmentFolderPath"
      let app_json_path = obsidian_dir.join("app.json");
      if let Ok(app_json_content) = fs::read_to_string(&app_json_path) {
        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&app_json_content) {
          if let Some(folder) = parsed.get("attachmentFolderPath").and_then(|v| v.as_str()) {
            let folder_clean = folder.trim();
            if folder_clean == "/" || folder_clean.is_empty() {
              let candidate = curr_dir.join(&clean_src);
              if candidate.exists() && candidate.is_file() {
                return Some(normalize_path_str(&candidate));
              }
            } else if folder_clean.starts_with("./") {
              let rel_sub = folder_clean.trim_start_matches("./");
              let candidate = base_dir.join(rel_sub).join(&clean_src);
              if candidate.exists() && candidate.is_file() {
                return Some(normalize_path_str(&candidate));
              }
            } else {
              let candidate = curr_dir.join(folder_clean).join(&clean_src);
              if candidate.exists() && candidate.is_file() {
                return Some(normalize_path_str(&candidate));
              }
            }
          }
        }
      }
    }

    // Check all common subdirectories in this ancestor folder
    for subdir in &common_subdirs {
      let target = if subdir.is_empty() {
        curr_dir.join(&clean_src)
      } else {
        curr_dir.join(subdir).join(&clean_src)
      };
      if target.exists() && target.is_file() {
        return Some(normalize_path_str(&target));
      }
    }

    if let Some(parent) = curr_dir.parent() {
      curr_dir = parent.to_path_buf();
    } else {
      break;
    }
  }

  // 5. Exhaustive search in Vault root or up to 4 levels up
  let search_root = vault_root.unwrap_or_else(|| {
    let mut root = base_dir.to_path_buf();
    for _ in 0..3 {
      if let Some(p) = root.parent() {
        root = p.to_path_buf();
      }
    }
    root
  });

  if let Some(found) = find_file_recursive(&search_root, filename_only, 0, 5) {
    return Some(normalize_path_str(&found));
  }

  None
}

#[tauri::command]
fn pick_image_dialog() -> Result<Option<String>, String> {
  let file = rfd::FileDialog::new()
    .add_filter(
      "Image Files",
      &["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico", "avif", "tiff"],
    )
    .pick_file();

  if let Some(path_buf) = file {
    Ok(Some(path_buf.to_string_lossy().to_string()))
  } else {
    Ok(None)
  }
}

#[tauri::command]
fn open_file_dialog() -> Result<Option<FileOpenResult>, String> {
  let file = rfd::FileDialog::new()
    .add_filter("Markdown Files", &["md", "markdown", "txt", "text"])
    .pick_file();

  if let Some(path_buf) = file {
    let path_str = path_buf.to_string_lossy().to_string();
    let name = path_buf.file_name().unwrap_or_default().to_string_lossy().to_string();
    let content = fs::read_to_string(&path_buf).map_err(|e| e.to_string())?;
    let meta = fs::metadata(&path_buf).map_err(|e| e.to_string())?;
    let duration = meta
      .modified()
      .map_err(|e| e.to_string())?
      .duration_since(UNIX_EPOCH)
      .map_err(|e| e.to_string())?;

    Ok(Some(FileOpenResult {
      name,
      path: path_str,
      content,
      modified: duration.as_millis() as u64,
    }))
  } else {
    Ok(None)
  }
}

#[tauri::command]
fn save_file_as_dialog(default_name: Option<String>, content: String) -> Result<Option<FileSaveResult>, String> {
  let mut dialog = rfd::FileDialog::new().add_filter("Markdown Files", &["md", "markdown", "txt"]);
  if let Some(name) = &default_name {
    dialog = dialog.set_file_name(name);
  }
  let file = dialog.save_file();

  if let Some(path_buf) = file {
    let path_str = path_buf.to_string_lossy().to_string();
    let name = path_buf.file_name().unwrap_or_default().to_string_lossy().to_string();
    fs::write(&path_buf, &content).map_err(|e| e.to_string())?;
    let meta = fs::metadata(&path_buf).map_err(|e| e.to_string())?;
    let duration = meta
      .modified()
      .map_err(|e| e.to_string())?
      .duration_since(UNIX_EPOCH)
      .map_err(|e| e.to_string())?;

    Ok(Some(FileSaveResult {
      name,
      path: path_str,
      modified: duration.as_millis() as u64,
    }))
  } else {
    Ok(None)
  }
}

#[tauri::command]
fn write_file_content(path: String, content: String) -> Result<u64, String> {
  fs::write(&path, &content).map_err(|e| e.to_string())?;
  let meta = fs::metadata(&path).map_err(|e| e.to_string())?;
  let duration = meta
    .modified()
    .map_err(|e| e.to_string())?
    .duration_since(UNIX_EPOCH)
    .map_err(|e| e.to_string())?;
  Ok(duration.as_millis() as u64)
}

#[tauri::command]
fn read_file_content(path: String) -> Result<String, String> {
  fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_file_metadata(path: String) -> Result<u64, String> {
  let meta = fs::metadata(&path).map_err(|e| e.to_string())?;
  let modified = meta.modified().map_err(|e| e.to_string())?;
  let duration = modified.duration_since(UNIX_EPOCH).map_err(|e| e.to_string())?;
  Ok(duration.as_millis() as u64)
}

#[tauri::command]
fn check_file_exists(path: String) -> bool {
  std::path::Path::new(&path).exists()
}

#[tauri::command]
fn get_cli_file() -> Result<Option<FileOpenResult>, String> {
  let args: Vec<String> = std::env::args().collect();
  for arg in args.iter().skip(1) {
    let p = Path::new(arg);
    if p.exists() && p.is_file() {
      let path_str = p.to_string_lossy().to_string();
      let name = p.file_name().unwrap_or_default().to_string_lossy().to_string();
      if let Ok(content) = fs::read_to_string(p) {
        let meta = fs::metadata(p).ok();
        let modified = meta
          .and_then(|m| m.modified().ok())
          .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
          .map(|d| d.as_millis() as u64)
          .unwrap_or_default();

        return Ok(Some(FileOpenResult {
          name,
          path: path_str,
          content,
          modified,
        }));
      }
    }
  }
  Ok(None)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
      for arg in argv.iter().skip(1) {
        let p = Path::new(arg);
        if p.exists() && p.is_file() {
          let path_str = p.to_string_lossy().to_string();
          let name = p.file_name().unwrap_or_default().to_string_lossy().to_string();
          if let Ok(content) = fs::read_to_string(p) {
            let meta = fs::metadata(p).ok();
            let modified = meta
              .and_then(|m| m.modified().ok())
              .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
              .map(|d| d.as_millis() as u64)
              .unwrap_or_default();

            let file_res = FileOpenResult {
              name,
              path: path_str,
              content,
              modified,
            };

            let _ = app.emit("open-file-from-cli", file_res);
            break;
          }
        }
      }

      if let Some(win) = app.get_webview_window("main") {
        let _ = win.set_focus();
        let _ = win.unminimize();
      }
    }))
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      open_file_dialog,
      save_file_as_dialog,
      write_file_content,
      read_file_content,
      get_file_metadata,
      check_file_exists,
      resolve_image_path,
      pick_image_dialog,
      read_image_data_url,
      get_cli_file
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
