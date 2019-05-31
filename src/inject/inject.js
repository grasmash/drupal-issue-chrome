chrome.extension.sendMessage({}, function(response) {
    var readyStateCheckInterval = setInterval(function() {
        if (document.readyState === "complete") {
            clearInterval(readyStateCheckInterval);

            // Get all anchors on the page linking to Drupal.org.
            var els = document.querySelectorAll("a[href^='https://www.drupal.org/']");
            for (var i = 0, l = els.length; i < l; i++) {
                var el = els[i];
                processAnchorElement(el);
            }
        }

        /**
         * Get the issue status text given a status code.
         *
         * @param status_code
         * @returns {*}
         */
        function getIssueStatusText(status_code) {
            var statuses = [];
            statuses[1] = "active";
            statuses[2] = "fixed";
            statuses[3] = "closed (duplicate)";
            statuses[4] = "postponed";
            statuses[5] = "closed (won't fix)";
            statuses[6] = "closed (works as designed)";
            statuses[7] = "closed (fixed)";
            statuses[8] = "needs review";
            statuses[13] = "needs work";
            statuses[14] = "reviewed & tested by the community";
            statuses[15] = "patch (to be ported)";
            statuses[16] = "postponed (maintainer needs more info)";
            statuses[17] = "closed (outdated)";
            statuses[18] = "closed (cannot reproduce)";

            return statuses[status_code];
        }

        /**
         * Process an anchor element if it refers to a Drupal.org issue.
         *
         * @param el
         */
        function processAnchorElement(el) {
            // Pattern matches:
            // https://www.drupal.org/project/drupal/issues/2982684
            // https://www.drupal.org/project/composer_initiative/issues/3053800
            var regex = 'https:\\/\\/www\\.drupal\\.org\\/([^0-9]+)([0-9]+)';

            // Extract issue id from href.
            var href = el.getAttribute('href');
            var matches = Array.from( href.matchAll(regex) );
            // Bail out if we can't find the issue id.
            if (matches[0] === undefined || matches[0][2] === undefined) {
                return;
            }
            var issue_id = matches[0][2];
            doProcessAnchorElement(el, issue_id);
        }

        /**
         * Process an issue link by rendering issue data or displaying error.
         *
         * @param el
         * @param issue_id
         */
        function doProcessAnchorElement(el, issue_id) {
            var original_innerHTML = el.innerHTML;
            // Prepend link text with [Loading...].
            el.innerHTML = '<span class="drupalorg-issue-message loading">[Loading...]</span> ' + el.innerHTML;

            // Load node info from a local cache if possible.
            var cache_key = "node_" + issue_id;
            chrome.storage.local.get([cache_key], function(items) {
                if (items.hasOwnProperty(cache_key) && items[cache_key].hasOwnProperty('cacheTime')) {
                    // 5 minute cache.
                    if (items[cache_key].cacheTime > Date.now() - 1000 * 60 * 5) {
                        var node = items[cache_key].node;
                        return renderAnchorElement(el, original_innerHTML, node);
                    }
                }

                fetchLiveAndRenderAnchorElement(el, original_innerHTML, issue_id);
            });

        }

        /**
         * Fetches issue info live from Drupal.org and then renders the anchor.
         *
         * @param el
         * @param original_innerHTML
         * @param issue_id
         */
        function fetchLiveAndRenderAnchorElement(el, original_innerHTML, issue_id) {
            const Http = new XMLHttpRequest();
            const url='https://www.drupal.org/api-d7/node.json?nid=' + issue_id;
            Http.responseType = 'json';
            Http.open("GET", url);
            Http.send();
            Http.onreadystatechange=(e)=>{
                // readyState 4 is DONE.
                if (Http.readyState === 4) {
                    var status = Http.status;
                    if (status === 200) {
                        var node = Http.response.list[0];
                        var cache_key = "node_" + issue_id;
                        var cache_data = {};
                        cache_data[cache_key] = {
                            node: node,
                            cacheTime: Date.now()
                        };
                        // Set the cache entry and then render the anchor.
                        chrome.storage.local.set(cache_data, function() {
                            renderAnchorElement(el, original_innerHTML, node);
                        });
                    }
                    else {
                        renderAnchorElementHttpError(el, original_innerHTML, status);
                    }
                }
            }
        }

        /**
         * Renders an anchor element using node info.
         *
         * @param el
         * @param original_innerHTML
         * @param node
         *
         * @todo Make format configurable via tokens in an options page.
         */
        function renderAnchorElement(el, original_innerHTML, node) {
            // Drupal.org returns a 200 even if the node doesn't exist.
            if (node === undefined || node.type !== 'project_issue') {
                // Restore original markup. Removes "loading" prefix.
                el.innerHTML = original_innerHTML;
                return false;
            }

            // Load extension options to determine render style.
            chrome.storage.sync.get({
                render_drupal_org: false,
                render_style: 'long'
            }, function(items) {
                var issue_status_text = getIssueStatusText(node.field_issue_status);
                var prefix = '<span class="drupalorg-issue issue-status-' + node.field_issue_status + '">';
                var suffix = '</span>';

                var content;
                // Only replace contents if anchor contents equals href. This
                // prevents destroying custom text.
                if (el.getAttribute('href') === original_innerHTML) {
                    if (items.render_style === 'long') {
                        content = '#' + node.nid + ': ' + node.title;
                    }
                    else {
                        content = '#' + node.nid;
                    }
                }
                // Otherwise, use original text content.
                else {
                    content = original_innerHTML;
                }
                el.innerHTML =  prefix + content + suffix;
                el.setAttribute('title', issue_status_text)
            });

        }

        /**
         * Renders an anchor element after a HTTP fetch error.
         *
         * @param el
         * @param original_innerHTML
         * @param status
         */
        function renderAnchorElementHttpError(el, original_innerHTML, status) {
            // Prepend error status to element text.
            el.innerHTML = '<span class="drupalorg-issue-message error">[' + status + ']</span> ' + original_innerHTML;
        }

    }, 10);
});