/**
 * Quick Class Selector - Admin JavaScript
 */
(function($) {
    'use strict';

    var hexColorRegex = /#([0-9a-fA-F]{3,6})\b/;

    function getHexColor(text) {
        if (!text) return null;
        var match = text.match(hexColorRegex);
        return match ? match[0] : null;
    }

    var ROWS_PER_PAGE = 25;

    var QCSAdmin = {
        allClasses: [],
        currentPage: 1,

        init: function() {
            this.loadClassesFromDOM();
            this.bindEvents();
            this.renderPage(1);
            this.initSortable();
        },

        /**
         * Read existing rows from the DOM into the allClasses array on initial load
         */
        loadClassesFromDOM: function() {
            var classes = [];
            $('#qcs-list-body .qcs-class-row').each(function() {
                classes.push({
                    class: $(this).find('.qcs-input-class').val() || '',
                    description: $(this).find('.qcs-input-description').val() || ''
                });
            });
            this.allClasses = classes;
        },

        bindEvents: function() {
            $('#qcs-add-class').on('click', $.proxy(this.addNewRow, this));
            $('#qcs-save-classes').on('click', $.proxy(this.saveClasses, this));
            $(document).on('click', '.qcs-delete-btn', $.proxy(this.deleteRow, this));
            $('#qcs-batch-import-btn').on('click', $.proxy(this.batchImport, this));
            $(document).on('input', '.qcs-input-description', this.updateSwatch);
            $(document).on('click', '#qcs-page-prev', $.proxy(this.prevPage, this));
            $(document).on('click', '#qcs-page-next', $.proxy(this.nextPage, this));
        },

        initSortable: function() {
            $('#qcs-list-body').sortable({
                handle: '.qcs-col-handle',
                placeholder: 'qcs-class-row ui-sortable-placeholder',
                axis: 'y',
                opacity: 0.8,
                update: $.proxy(function() {
                    this.syncSortOrderToArray();
                }, this)
            });
        },

        /**
         * Calculate total pages
         */
        getTotalPages: function() {
            return Math.max(1, Math.ceil(this.allClasses.length / ROWS_PER_PAGE));
        },

        /**
         * Read current DOM inputs back into the allClasses array
         */
        syncCurrentPageToArray: function() {
            var self = this;
            var startIndex = (this.currentPage - 1) * ROWS_PER_PAGE;

            $('#qcs-list-body .qcs-class-row').each(function(i) {
                var globalIndex = startIndex + i;
                if (globalIndex < self.allClasses.length) {
                    self.allClasses[globalIndex] = {
                        class: $(this).find('.qcs-input-class').val() || '',
                        description: $(this).find('.qcs-input-description').val() || ''
                    };
                }
            });
        },

        /**
         * After sortable reorder, update the array slice for the current page
         */
        syncSortOrderToArray: function() {
            var startIndex = (this.currentPage - 1) * ROWS_PER_PAGE;
            var reordered = [];

            $('#qcs-list-body .qcs-class-row').each(function() {
                reordered.push({
                    class: $(this).find('.qcs-input-class').val() || '',
                    description: $(this).find('.qcs-input-description').val() || ''
                });
            });

            // Replace the current page slice in allClasses
            var args = [startIndex, reordered.length].concat(reordered);
            Array.prototype.splice.apply(this.allClasses, args);
        },

        /**
         * Render a specific page of classes
         */
        renderPage: function(page) {
            var totalPages = this.getTotalPages();
            page = Math.max(1, Math.min(page, totalPages));
            this.currentPage = page;

            var $listBody = $('#qcs-list-body');
            var template = $('#qcs-row-template').html();
            var startIndex = (page - 1) * ROWS_PER_PAGE;
            var pageItems = this.allClasses.slice(startIndex, startIndex + ROWS_PER_PAGE);

            $listBody.empty();

            pageItems.forEach(function(item, i) {
                var globalIndex = startIndex + i;
                var newRow = template.replace(/\{\{index\}\}/g, globalIndex);
                var $row = $(newRow);

                $row.find('.qcs-input-class').val(item.class);
                $row.find('.qcs-input-description').val(item.description);

                $listBody.append($row);
            });

            this.renderPagination();
            this.updateAllSwatches();
        },

        /**
         * Render pagination controls
         */
        renderPagination: function() {
            var $container = $('#qcs-pagination');
            var totalPages = this.getTotalPages();
            var total = this.allClasses.length;

            // Remove existing pagination if present
            if (!$container.length) {
                $container = $('<div id="qcs-pagination" class="qcs-pagination"></div>');
                $('#qcs-list-body').after($container);
            }

            // Only show pagination when there are more items than one page
            if (total <= ROWS_PER_PAGE) {
                $container.empty().hide();
                return;
            }

            $container.show().html(
                '<button type="button" id="qcs-page-prev" class="button"' +
                    (this.currentPage <= 1 ? ' disabled' : '') +
                '>&laquo; Vorige</button>' +
                '<span class="qcs-page-info">Pagina ' + this.currentPage + ' van ' + totalPages +
                ' (' + total + ' classes)</span>' +
                '<button type="button" id="qcs-page-next" class="button"' +
                    (this.currentPage >= totalPages ? ' disabled' : '') +
                '>Volgende &raquo;</button>'
            );
        },

        prevPage: function() {
            if (this.currentPage > 1) {
                this.syncCurrentPageToArray();
                this.renderPage(this.currentPage - 1);
            }
        },

        nextPage: function() {
            if (this.currentPage < this.getTotalPages()) {
                this.syncCurrentPageToArray();
                this.renderPage(this.currentPage + 1);
            }
        },

        addNewRow: function() {
            // Sync current page first
            this.syncCurrentPageToArray();

            // Add empty entry to the array
            this.allClasses.push({ class: '', description: '' });

            // Navigate to last page
            var lastPage = this.getTotalPages();
            this.renderPage(lastPage);

            // Focus on the new class input
            $('#qcs-list-body .qcs-class-row:last-child .qcs-input-class').focus();
        },

        deleteRow: function(e) {
            var $btn = $(e.target).closest('.qcs-delete-btn');
            var $row = $btn.closest('.qcs-class-row');
            var rowIndex = $row.index();
            var globalIndex = ((this.currentPage - 1) * ROWS_PER_PAGE) + rowIndex;
            var self = this;

            if (confirm(qcsAdmin.strings.confirmDelete)) {
                // Sync any edits on the current page before deleting
                this.syncCurrentPageToArray();

                // Remove from the global array
                this.allClasses.splice(globalIndex, 1);

                // If the current page is now beyond the last page, go back
                var totalPages = this.getTotalPages();
                if (this.currentPage > totalPages) {
                    this.currentPage = totalPages;
                }

                $row.fadeOut(200, function() {
                    self.renderPage(self.currentPage);
                });
            }
        },

        /**
         * Collect all classes from the in-memory array (syncing current page first)
         */
        collectClasses: function() {
            this.syncCurrentPageToArray();

            return this.allClasses.filter(function(item) {
                return item.class && item.class.trim();
            }).map(function(item) {
                var className = item.class.trim().replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
                return {
                    class: className,
                    description: (item.description || '').trim()
                };
            });
        },

        saveClasses: function() {
            var $button = $('#qcs-save-classes');
            var $status = $('#qcs-save-status');
            var classes = this.collectClasses();

            $button.prop('disabled', true);
            $status.text('').removeClass('success error');

            var self = this;

            $.ajax({
                url: qcsAdmin.ajaxUrl,
                method: 'POST',
                data: {
                    action: 'qcs_save_classes',
                    nonce: qcsAdmin.nonce,
                    classes: classes
                },
                success: function(response) {
                    if (response.success) {
                        $status.text(qcsAdmin.strings.saved).addClass('success');
                        self.allClasses = response.data.classes.slice();
                        self.renderPage(self.currentPage);
                    } else {
                        $status.text(qcsAdmin.strings.error).addClass('error');
                    }
                },
                error: function() {
                    $status.text(qcsAdmin.strings.error).addClass('error');
                },
                complete: function() {
                    $button.prop('disabled', false);
                    setTimeout(function() {
                        $status.fadeOut(300, function() {
                            $(this).text('').show().removeClass('success error');
                        });
                    }, 2000);
                }
            });
        },

        batchImport: function() {
            var $button = $('#qcs-batch-import-btn');
            var $status = $('#qcs-batch-status');
            var $textarea = $('#qcs-batch-input');
            var importData = $textarea.val().trim();

            if (!importData) {
                $status.text(qcsAdmin.strings.importEmpty).removeClass('success').addClass('error').show();
                return;
            }

            $button.prop('disabled', true);
            $status.text('').removeClass('success error');

            var self = this;

            $.ajax({
                url: qcsAdmin.ajaxUrl,
                method: 'POST',
                data: {
                    action: 'qcs_batch_import',
                    nonce: qcsAdmin.nonce,
                    import_data: importData
                },
                success: function(response) {
                    if (response.success) {
                        $status.text(response.data.message).addClass('success').show();
                        self.allClasses = response.data.classes.slice();
                        self.renderPage(self.getTotalPages());
                        $textarea.val('');
                    } else {
                        $status.text(qcsAdmin.strings.error).addClass('error').show();
                    }
                },
                error: function() {
                    $status.text(qcsAdmin.strings.error).addClass('error').show();
                },
                complete: function() {
                    $button.prop('disabled', false);
                    setTimeout(function() {
                        $status.fadeOut(300, function() {
                            $(this).text('').show().removeClass('success error');
                        });
                    }, 3000);
                }
            });
        },

        updateSwatch: function() {
            var $input = $(this);
            var $row = $input.closest('.qcs-class-row');
            var $swatch = $row.find('.qcs-color-swatch');
            var color = getHexColor($input.val());

            if (color) {
                if ($swatch.length) {
                    $swatch.css('background-color', color);
                } else {
                    $input.after('<span class="qcs-color-swatch" style="background-color: ' + color + '"></span>');
                }
            } else {
                $swatch.remove();
            }
        },

        updateAllSwatches: function() {
            $('.qcs-input-description').each(function() {
                QCSAdmin.updateSwatch.call(this);
            });
        }
    };

    $(document).ready(function() {
        QCSAdmin.init();
    });

})(jQuery);
