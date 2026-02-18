<?php
/**
 * Plugin Name: Quick Class Selector
 * Plugin URI: https://github.com/GeertGK/Quick-Class-Selection
 * Description: Voeg snel voorgedefinieerde CSS classes toe aan Gutenberg blocks via een handige multi-select.
 * Version: 1.2.0
 * Author: Samuel Studios
 * Author URI: https://samuelstudios.nl
 * GitHub Plugin URI: https://github.com/GeertGK/Quick-Class-Selection
 * GitHub Branch: main
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: quick-class-selector
 * Domain Path: /languages
 * Requires at least: 5.8
 * Requires PHP: 7.4
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'QCS_VERSION', '1.2.0' );
define( 'QCS_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'QCS_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

// Load classes
require_once QCS_PLUGIN_DIR . 'includes/class-admin-settings.php';
require_once QCS_PLUGIN_DIR . 'includes/class-github-updater.php';

/**
 * Initialize the plugin
 */
function qcs_init() {
    // Initialize admin settings
    new QCS_Admin_Settings();

    // Initialize GitHub updater for automatic updates
    new QCS_GitHub_Updater( __FILE__ );
}
add_action( 'plugins_loaded', 'qcs_init' );

/**
 * Enqueue editor scripts
 */
function qcs_enqueue_editor_assets() {
    $classes = get_option( 'qcs_predefined_classes', array() );

    wp_enqueue_script(
        'qcs-editor',
        QCS_PLUGIN_URL . 'assets/js/editor.js',
        array( 'wp-blocks', 'wp-dom-ready', 'wp-edit-post', 'wp-hooks', 'wp-compose', 'wp-components', 'wp-element', 'wp-block-editor' ),
        QCS_VERSION,
        true
    );

    wp_localize_script( 'qcs-editor', 'qcsSettings', array(
        'classes' => $classes,
    ) );

    wp_enqueue_style(
        'qcs-editor-style',
        QCS_PLUGIN_URL . 'assets/css/editor.css',
        array(),
        QCS_VERSION
    );
}
add_action( 'enqueue_block_editor_assets', 'qcs_enqueue_editor_assets' );

/**
 * Activation hook
 */
function qcs_activate() {
    // Set default options if not exists
    if ( false === get_option( 'qcs_predefined_classes' ) ) {
        add_option( 'qcs_predefined_classes', array() );
    }
}
register_activation_hook( __FILE__, 'qcs_activate' );
