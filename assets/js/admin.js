/**
 * Quick Class Selector - Admin JavaScript
 */
(function($) {
    'use strict';

    var QCSAdmin = {
        init: function() {
            this.bindEvents();
            this.initSortable();
        },

        bindEvents: function() {
            $('#qcs-add-class').on('click', this.addNewRow);
            $('#qcs-save-classes').on('click', this.saveClasses);
            $(document).on('click', '.qcs-delete-btn', this.deleteRow);
        },

        initSortable: function() {
            $('#qcs-list-body').sortable({
                handle: '.qcs-col-handle',
                placeholder: 'qcs-class-row ui-sortable-placeholder',
                axis: 'y',
                opacity: 0.8,
                update: function() {
                    QCSAdmin.updateIndices();
                }
            });
        },

        addNewRow: function() {
            var template = $('#qcs-row-template').html();
            var index = $('#qcs-list-body .qcs-class-row').length;
            var newRow = template.replace(/\{\{index\}\}/g, index);

            $('#qcs-list-body').append(newRow);

            // Focus on the new class input
            $('#qcs-list-body .qcs-class-row:last-child .qcs-input-class').focus();
        },

        deleteRow: function() {
            var $row = $(this).closest('.qcs-class-row');

            if (confirm(qcsAdmin.strings.confirmDelete)) {
                $row.fadeOut(200, function() {
                    $(this).remove();
                    QCSAdmin.updateIndices();
                });
            }
        },

        updateIndices: function() {
            $('#qcs-list-body .qcs-class-row').each(function(index) {
                $(this).attr('data-index', index);
            });
        },

        collectClasses: function() {
            var classes = [];

            $('#qcs-list-body .qcs-class-row').each(function() {
                var className = $(this).find('.qcs-input-class').val().trim();
                var description = $(this).find('.qcs-input-description').val().trim();

                if (className) {
                    // Sanitize class name (remove spaces, special chars)
                    className = className.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();

                    classes.push({
                        class: className,
                        description: description
                    });
                }
            });

            return classes;
        },

        saveClasses: function() {
            var $button = $(this);
            var $status = $('#qcs-save-status');
            var classes = QCSAdmin.collectClasses();

            $button.prop('disabled', true);
            $status.text('').removeClass('success error');

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
                        QCSAdmin.refreshList(response.data.classes);
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

        refreshList: function(classes) {
            var $listBody = $('#qcs-list-body');
            var template = $('#qcs-row-template').html();

            $listBody.empty();

            classes.forEach(function(item, index) {
                var newRow = template.replace(/\{\{index\}\}/g, index);
                var $row = $(newRow);

                $row.find('.qcs-input-class').val(item.class);
                $row.find('.qcs-input-description').val(item.description);

                $listBody.append($row);
            });
        }
    };

    $(document).ready(function() {
        QCSAdmin.init();
    });

})(jQuery);
