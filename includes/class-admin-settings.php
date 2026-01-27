<?php
/**
 * Admin Settings Class
 *
 * @package Quick_Class_Selector
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class QCS_Admin_Settings {

    /**
     * Constructor
     */
    public function __construct() {
        add_action( 'admin_menu', array( $this, 'add_admin_menu' ) );
        add_action( 'admin_init', array( $this, 'register_settings' ) );
        add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_admin_scripts' ) );
        add_action( 'wp_ajax_qcs_save_classes', array( $this, 'ajax_save_classes' ) );
        add_action( 'wp_ajax_qcs_delete_class', array( $this, 'ajax_delete_class' ) );
    }

    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        add_options_page(
            __( 'Quick Class Selector', 'quick-class-selector' ),
            __( 'Quick Class Selector', 'quick-class-selector' ),
            'manage_options',
            'quick-class-selector',
            array( $this, 'render_settings_page' )
        );
    }

    /**
     * Register settings
     */
    public function register_settings() {
        register_setting( 'qcs_settings', 'qcs_predefined_classes', array(
            'type' => 'array',
            'sanitize_callback' => array( $this, 'sanitize_classes' ),
            'default' => array(),
        ) );
    }

    /**
     * Sanitize classes array
     */
    public function sanitize_classes( $input ) {
        if ( ! is_array( $input ) ) {
            return array();
        }

        $sanitized = array();
        foreach ( $input as $item ) {
            if ( isset( $item['class'] ) && ! empty( $item['class'] ) ) {
                $sanitized[] = array(
                    'class' => sanitize_html_class( $item['class'] ),
                    'description' => isset( $item['description'] ) ? sanitize_text_field( $item['description'] ) : '',
                );
            }
        }

        return $sanitized;
    }

    /**
     * Enqueue admin scripts
     */
    public function enqueue_admin_scripts( $hook ) {
        if ( 'settings_page_quick-class-selector' !== $hook ) {
            return;
        }

        wp_enqueue_style(
            'qcs-admin',
            QCS_PLUGIN_URL . 'assets/css/admin.css',
            array(),
            QCS_VERSION
        );

        wp_enqueue_script(
            'qcs-admin',
            QCS_PLUGIN_URL . 'assets/js/admin.js',
            array( 'jquery', 'jquery-ui-sortable' ),
            QCS_VERSION,
            true
        );

        wp_localize_script( 'qcs-admin', 'qcsAdmin', array(
            'ajaxUrl' => admin_url( 'admin-ajax.php' ),
            'nonce' => wp_create_nonce( 'qcs_admin_nonce' ),
            'strings' => array(
                'confirmDelete' => __( 'Weet je zeker dat je deze class wilt verwijderen?', 'quick-class-selector' ),
                'saved' => __( 'Opgeslagen!', 'quick-class-selector' ),
                'error' => __( 'Er is een fout opgetreden.', 'quick-class-selector' ),
            ),
        ) );
    }

    /**
     * AJAX save classes
     */
    public function ajax_save_classes() {
        check_ajax_referer( 'qcs_admin_nonce', 'nonce' );

        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( 'Geen toegang' );
        }

        $classes = isset( $_POST['classes'] ) ? $_POST['classes'] : array();
        $sanitized = $this->sanitize_classes( $classes );

        update_option( 'qcs_predefined_classes', $sanitized );

        wp_send_json_success( array(
            'message' => __( 'Classes opgeslagen!', 'quick-class-selector' ),
            'classes' => $sanitized,
        ) );
    }

    /**
     * AJAX delete class
     */
    public function ajax_delete_class() {
        check_ajax_referer( 'qcs_admin_nonce', 'nonce' );

        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( 'Geen toegang' );
        }

        $index = isset( $_POST['index'] ) ? intval( $_POST['index'] ) : -1;
        $classes = get_option( 'qcs_predefined_classes', array() );

        if ( $index >= 0 && isset( $classes[ $index ] ) ) {
            array_splice( $classes, $index, 1 );
            update_option( 'qcs_predefined_classes', $classes );
            wp_send_json_success( array(
                'message' => __( 'Class verwijderd!', 'quick-class-selector' ),
                'classes' => $classes,
            ) );
        }

        wp_send_json_error( 'Class niet gevonden' );
    }

    /**
     * Render settings page
     */
    public function render_settings_page() {
        $classes = get_option( 'qcs_predefined_classes', array() );
        ?>
        <div class="wrap qcs-admin-wrap">
            <h1><?php esc_html_e( 'Quick Class Selector', 'quick-class-selector' ); ?></h1>
            <p class="description">
                <?php esc_html_e( 'Beheer hier je voorgedefinieerde CSS classes. Deze classes verschijnen als multi-select opties in de Gutenberg editor onder "Extra CSS klasse(n)".', 'quick-class-selector' ); ?>
            </p>

            <div class="qcs-settings-container">
                <div class="qcs-classes-list" id="qcs-classes-list">
                    <div class="qcs-list-header">
                        <span class="qcs-col-handle"></span>
                        <span class="qcs-col-class"><?php esc_html_e( 'Class naam', 'quick-class-selector' ); ?></span>
                        <span class="qcs-col-description"><?php esc_html_e( 'Beschrijving', 'quick-class-selector' ); ?></span>
                        <span class="qcs-col-actions"><?php esc_html_e( 'Acties', 'quick-class-selector' ); ?></span>
                    </div>
                    <div class="qcs-list-body" id="qcs-list-body">
                        <?php if ( ! empty( $classes ) ) : ?>
                            <?php foreach ( $classes as $index => $item ) : ?>
                                <div class="qcs-class-row" data-index="<?php echo esc_attr( $index ); ?>">
                                    <span class="qcs-col-handle">
                                        <span class="dashicons dashicons-menu"></span>
                                    </span>
                                    <span class="qcs-col-class">
                                        <input type="text" class="qcs-input-class" value="<?php echo esc_attr( $item['class'] ); ?>" placeholder="class-naam" />
                                    </span>
                                    <span class="qcs-col-description">
                                        <input type="text" class="qcs-input-description" value="<?php echo esc_attr( $item['description'] ); ?>" placeholder="Optionele beschrijving..." />
                                    </span>
                                    <span class="qcs-col-actions">
                                        <button type="button" class="button qcs-delete-btn" title="<?php esc_attr_e( 'Verwijderen', 'quick-class-selector' ); ?>">
                                            <span class="dashicons dashicons-trash"></span>
                                        </button>
                                    </span>
                                </div>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </div>
                </div>

                <div class="qcs-actions">
                    <button type="button" class="button button-secondary" id="qcs-add-class">
                        <span class="dashicons dashicons-plus-alt2"></span>
                        <?php esc_html_e( 'Nieuwe class toevoegen', 'quick-class-selector' ); ?>
                    </button>
                    <button type="button" class="button button-primary" id="qcs-save-classes">
                        <?php esc_html_e( 'Opslaan', 'quick-class-selector' ); ?>
                    </button>
                    <span class="qcs-save-status" id="qcs-save-status"></span>
                </div>
            </div>

            <div class="qcs-help-section">
                <h3><?php esc_html_e( 'Hoe te gebruiken', 'quick-class-selector' ); ?></h3>
                <ol>
                    <li><?php esc_html_e( 'Voeg hier je CSS class namen toe met een optionele beschrijving.', 'quick-class-selector' ); ?></li>
                    <li><?php esc_html_e( 'Sleep de rijen om de volgorde aan te passen.', 'quick-class-selector' ); ?></li>
                    <li><?php esc_html_e( 'Open een pagina of bericht in de Gutenberg editor.', 'quick-class-selector' ); ?></li>
                    <li><?php esc_html_e( 'Selecteer een block en ga naar "Geavanceerd" in de zijbalk.', 'quick-class-selector' ); ?></li>
                    <li><?php esc_html_e( 'Gebruik de "Quick Classes" multi-select om classes toe te voegen.', 'quick-class-selector' ); ?></li>
                </ol>
            </div>
        </div>

        <script type="text/template" id="qcs-row-template">
            <div class="qcs-class-row" data-index="{{index}}">
                <span class="qcs-col-handle">
                    <span class="dashicons dashicons-menu"></span>
                </span>
                <span class="qcs-col-class">
                    <input type="text" class="qcs-input-class" value="" placeholder="class-naam" />
                </span>
                <span class="qcs-col-description">
                    <input type="text" class="qcs-input-description" value="" placeholder="Optionele beschrijving..." />
                </span>
                <span class="qcs-col-actions">
                    <button type="button" class="button qcs-delete-btn" title="<?php esc_attr_e( 'Verwijderen', 'quick-class-selector' ); ?>">
                        <span class="dashicons dashicons-trash"></span>
                    </button>
                </span>
            </div>
        </script>
        <?php
    }
}
