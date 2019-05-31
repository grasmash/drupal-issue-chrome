// Saves options to chrome.storage.
function save_options() {
    var render_targets = document.getElementById('render_targets').checked;
    var rewrite_link_contents = document.getElementById('rewrite_link_contents').checked;
    var render_drupal_org = document.getElementById('render_drupal_org').checked;
    var render_pattern = document.getElementById('render_pattern').value;

    chrome.storage.sync.set({
        render_targets: render_targets,
        rewrite_link_contents: rewrite_link_contents,
        render_drupal_org: render_drupal_org,
        render_pattern: render_pattern
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
        render_drupal_org: false,
        render_style: 'long'
    }, function(items) {
        document.getElementById('render_targets').value = items.render_targets;
        document.getElementById('rewrite_link_contents').value = items.rewrite_link_contents;
        document.getElementById('render_drupal_org').value = items.render_drupal_org;
        document.getElementById('render_pattern').value = items.render_pattern;
    });
}

// Set option values on load.
document.addEventListener('DOMContentLoaded', restore_options);
// Save custom values.
document.getElementById('save').addEventListener('click',
    save_options);