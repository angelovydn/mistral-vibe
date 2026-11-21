//! Open the local gallery and leave a usable link in the terminal.

use std::sync::Arc;

use serde::Deserialize;

use super::{spawn_session, CommandEvent};
use crate::app::App;
use crate::server::{method, Client};

#[derive(Deserialize)]
struct Gallery {
    url: String,
}

pub(super) fn open(app: &mut App, client: &Arc<Client>) {
    spawn_session(app, client, |client, session_id| async move {
        let params = serde_json::json!({ "sessionId": session_id });
        let value = match client.request_err(method::TEMPLATES_OPEN, params).await {
            Ok(value) => value,
            Err(error) if error.is_method_not_found() => {
                return CommandEvent::Error(
                    "This app server does not support Templates. Update the app server to open the gallery.".to_owned(),
                );
            }
            Err(error) => {
                return CommandEvent::Error(format!("Could not open Templates: {}", error.message));
            }
        };
        let Ok(gallery) = serde_json::from_value::<Gallery>(value) else {
            return CommandEvent::Error("Templates returned no gallery URL.".to_owned());
        };
        let url = gallery.url;
        if !crate::external_url::open_private_loopback(&url) {
            return CommandEvent::Error("Templates returned an invalid local URL.".to_owned());
        }
        CommandEvent::Result(format!("**Templates**\n\nOpen in your browser: <{url}>"))
    });
}
