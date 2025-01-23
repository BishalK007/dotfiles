// src/models/mod.rs

use std::ffi::c_double;

use serde::Deserialize;

#[derive(Deserialize, Debug)]
pub struct Monitor {
    pub focused: bool,

    #[serde(rename = "activeWorkspace")]
    pub active_workspace: Workspace,

    #[serde(rename = "scale")]
    pub scale: c_double,
    
    #[serde(rename = "width")]
    pub width: i32,
    
    #[serde(rename = "height")]
    pub height: i32,


    // Add other fields if needed
}

#[derive(Deserialize, Debug)]
pub struct Workspace {
    pub id: u32,
    pub name: String, // Add other fields if needed
}