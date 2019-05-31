// Saves options to chrome.storage.
function save_options() {
    var render_style = document.getElementById('render_style').value;

    chrome.storage.sync.set({
        render_style: render_style
    }, function() {
        // Update status to let user know options were saved.
        var status = document.getElementById('status');
        status.textContent = 'Options saved.';
        setTimeout(function() {
            status.textContent = '';
        }, 750);
    });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
    // Set default values.
    chrome.storage.sync.get({
        render_style: 'long'
    }, function(items) {
        document.getElementById('render_style').value = items.render_style;
    });
}

// Set option values on load.
document.addEventListener('DOMContentLoaded', restore_options);
// Save custom values.
document.getElementById('save').addEventListener('click',
    save_options);