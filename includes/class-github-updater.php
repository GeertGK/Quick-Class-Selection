<?php
/**
 * GitHub Plugin Updater
 *
 * Enables automatic updates from a GitHub repository.
 *
 * @package Quick_Class_Selector
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class QCS_GitHub_Updater {

    /**
     * Plugin file path
     *
     * @var string
     */
    private $file;

    /**
     * Plugin data
     *
     * @var array
     */
    private $plugin;

    /**
     * Plugin basename
     *
     * @var string
     */
    private $basename;

    /**
     * GitHub username
     *
     * @var string
     */
    private $github_username = 'GeertGK';

    /**
     * GitHub repository name
     *
     * @var string
     */
    private $github_repo = 'Quick-Class-Selection';

    /**
     * GitHub API response
     *
     * @var object
     */
    private $github_response;

    /**
     * Constructor
     *
     * @param string $file Main plugin file path.
     */
    public function __construct( $file ) {
        $this->file = $file;
        $this->basename = plugin_basename( $file );

        add_action( 'admin_init', array( $this, 'set_plugin_properties' ) );
        add_filter( 'pre_set_site_transient_update_plugins', array( $this, 'check_update' ) );
        add_filter( 'plugins_api', array( $this, 'plugin_info' ), 20, 3 );
        add_filter( 'upgrader_post_install', array( $this, 'after_install' ), 10, 3 );
        add_filter( 'upgrader_source_selection', array( $this, 'fix_source_dir' ), 10, 4 );
    }

    /**
     * Set plugin properties
     */
    public function set_plugin_properties() {
        if ( ! function_exists( 'get_plugin_data' ) ) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }
        $this->plugin = get_plugin_data( $this->file );
    }

    /**
     * Get GitHub repository info
     *
     * @return object|bool
     */
    private function get_repository_info() {
        if ( ! empty( $this->github_response ) ) {
            return $this->github_response;
        }

        $transient_key = 'qcs_github_response';
        $cached = get_transient( $transient_key );

        if ( false !== $cached ) {
            $this->github_response = $cached;
            return $cached;
        }

        $request_uri = sprintf(
            'https://api.github.com/repos/%s/%s/releases/latest',
            $this->github_username,
            $this->github_repo
        );

        $response = wp_remote_get(
            $request_uri,
            array(
                'headers' => array(
                    'Accept' => 'application/vnd.github.v3+json',
                ),
            )
        );

        if ( is_wp_error( $response ) || 200 !== wp_remote_retrieve_response_code( $response ) ) {
            return false;
        }

        $response_body = wp_remote_retrieve_body( $response );
        $result = json_decode( $response_body );

        if ( empty( $result ) || isset( $result->message ) ) {
            return false;
        }

        $this->github_response = $result;
        set_transient( $transient_key, $result, HOUR_IN_SECONDS * 6 );

        return $result;
    }

    /**
     * Check for plugin update
     *
     * @param object $transient Update transient.
     * @return object
     */
    public function check_update( $transient ) {
        if ( empty( $transient->checked ) ) {
            return $transient;
        }

        $release = $this->get_repository_info();

        if ( false === $release ) {
            return $transient;
        }

        // Get version from tag (remove 'v' prefix if present)
        $github_version = ltrim( $release->tag_name, 'v' );
        $current_version = isset( $this->plugin['Version'] ) ? $this->plugin['Version'] : QCS_VERSION;

        if ( version_compare( $github_version, $current_version, '>' ) ) {
            $download_url = $release->zipball_url;

            // Check for uploaded asset (preferred)
            if ( ! empty( $release->assets ) ) {
                foreach ( $release->assets as $asset ) {
                    if ( 'application/zip' === $asset->content_type || strpos( $asset->name, '.zip' ) !== false ) {
                        $download_url = $asset->browser_download_url;
                        break;
                    }
                }
            }

            $transient->response[ $this->basename ] = (object) array(
                'slug'        => dirname( $this->basename ),
                'plugin'      => $this->basename,
                'new_version' => $github_version,
                'url'         => $this->plugin['PluginURI'],
                'package'     => $download_url,
                'icons'       => array(),
                'banners'     => array(),
                'tested'      => '',
                'requires'    => '5.8',
                'requires_php' => '7.4',
            );
        }

        return $transient;
    }

    /**
     * Plugin information for the update details popup
     *
     * @param bool|object $result Plugin info result.
     * @param string      $action API action.
     * @param object      $args   API arguments.
     * @return bool|object
     */
    public function plugin_info( $result, $action, $args ) {
        if ( 'plugin_information' !== $action ) {
            return $result;
        }

        if ( dirname( $this->basename ) !== $args->slug ) {
            return $result;
        }

        $release = $this->get_repository_info();

        if ( false === $release ) {
            return $result;
        }

        $github_version = ltrim( $release->tag_name, 'v' );

        $plugin_info = (object) array(
            'name'              => $this->plugin['Name'],
            'slug'              => dirname( $this->basename ),
            'version'           => $github_version,
            'author'            => $this->plugin['AuthorName'],
            'author_profile'    => $this->plugin['AuthorURI'],
            'homepage'          => $this->plugin['PluginURI'],
            'short_description' => $this->plugin['Description'],
            'sections'          => array(
                'description'  => $this->plugin['Description'],
                'changelog'    => $this->parse_changelog( $release->body ),
            ),
            'download_link'     => $release->zipball_url,
            'requires'          => '5.8',
            'requires_php'      => '7.4',
            'tested'            => '',
            'last_updated'      => $release->published_at,
        );

        // Check for uploaded asset
        if ( ! empty( $release->assets ) ) {
            foreach ( $release->assets as $asset ) {
                if ( 'application/zip' === $asset->content_type || strpos( $asset->name, '.zip' ) !== false ) {
                    $plugin_info->download_link = $asset->browser_download_url;
                    break;
                }
            }
        }

        return $plugin_info;
    }

    /**
     * Parse changelog from release body (Markdown)
     *
     * @param string $body Release body.
     * @return string
     */
    private function parse_changelog( $body ) {
        if ( empty( $body ) ) {
            return '<p>No changelog provided.</p>';
        }

        // Basic Markdown to HTML conversion
        $changelog = esc_html( $body );
        $changelog = nl2br( $changelog );
        $changelog = preg_replace( '/\*\*(.+?)\*\*/', '<strong>$1</strong>', $changelog );
        $changelog = preg_replace( '/\*(.+?)\*/', '<em>$1</em>', $changelog );
        $changelog = preg_replace( '/^- (.+)/m', '<li>$1</li>', $changelog );
        $changelog = preg_replace( '/((<li>.*<\/li>\s*)+)/', '<ul>$1</ul>', $changelog );

        return $changelog;
    }

    /**
     * Fix the source directory name after extraction
     *
     * GitHub downloads extract to a folder like "username-repo-hash"
     * We need to rename it to match the expected plugin folder name
     *
     * @param string      $source        Source directory.
     * @param string      $remote_source Remote source directory.
     * @param WP_Upgrader $upgrader      Upgrader instance.
     * @param array       $hook_extra    Extra hook arguments.
     * @return string
     */
    public function fix_source_dir( $source, $remote_source, $upgrader, $hook_extra ) {
        global $wp_filesystem;

        // For auto-updates, check hook_extra. For manual uploads, check if
        // our main plugin file exists in the extracted source folder.
        $is_our_plugin = false;

        if ( isset( $hook_extra['plugin'] ) && $hook_extra['plugin'] === $this->basename ) {
            $is_our_plugin = true;
        } elseif ( $wp_filesystem->exists( trailingslashit( $source ) . basename( $this->file ) ) ) {
            $is_our_plugin = true;
        }

        if ( ! $is_our_plugin ) {
            return $source;
        }

        $expected_slug = dirname( $this->basename );
        $new_source = trailingslashit( $remote_source ) . trailingslashit( $expected_slug );

        if ( trailingslashit( $source ) === $new_source ) {
            return $source;
        }

        if ( $wp_filesystem->move( untrailingslashit( $source ), untrailingslashit( $new_source ) ) ) {
            return $new_source;
        }

        return $source;
    }

    /**
     * After install, reactivate the plugin
     *
     * @param bool  $response   Install response.
     * @param array $hook_extra Extra hook arguments.
     * @param array $result     Install result.
     * @return array
     */
    public function after_install( $response, $hook_extra, $result ) {
        global $wp_filesystem;

        if ( ! isset( $hook_extra['plugin'] ) || $hook_extra['plugin'] !== $this->basename ) {
            return $result;
        }

        // Reactivate plugin
        activate_plugin( $this->basename );

        return $result;
    }

    /**
     * Clear update transient (useful for testing)
     */
    public static function clear_cache() {
        delete_transient( 'qcs_github_response' );
        delete_site_transient( 'update_plugins' );
    }
}
