<?php
/**
 * DokuWiki Plugin struct (Action Component)
 *
 * @license GPL 2 http://www.gnu.org/licenses/gpl-2.0.html
 * @author  Andreas Gohr, Michael Große <dokuwiki@cosmocode.de>
 */

// must be run within Dokuwiki
use dokuwiki\plugin\struct\meta\AccessTable;
use dokuwiki\plugin\struct\meta\AccessTableData;
use dokuwiki\plugin\struct\meta\Column;
use dokuwiki\plugin\struct\meta\LookupTable;
use dokuwiki\plugin\struct\meta\Schema;
use dokuwiki\plugin\struct\meta\SearchConfig;
use dokuwiki\plugin\struct\meta\StructException;
use dokuwiki\plugin\struct\meta\Value;

/**
 * Class action_plugin_struct_lookup
 *
 * Handle lookup table editing
 */
class action_plugin_struct_lookup extends DokuWiki_Action_Plugin
{

    /** @var  AccessTableData */
    protected $schemadata = null;

    /** @var  Column */
    protected $column = null;

    /** @var String */
    protected $pid = '';

    /**
     * Registers a callback function for a given event
     *
     * @param Doku_Event_Handler $controller DokuWiki's event controller object
     * @return void
     */
    public function register(Doku_Event_Handler $controller)
    {
        $controller->register_hook('AJAX_CALL_UNKNOWN', 'BEFORE', $this, 'handleAjax');
    }

    /**
     * @param Doku_Event $event
     * @param $param
     */
    public function handleAjax(Doku_Event $event, $param)
    {
        $len = strlen('plugin_struct_lookup_');
        if (substr($event->data, 0, $len) != 'plugin_struct_lookup_') {
            return;
        }
        $event->preventDefault();
        $event->stopPropagation();

        try {

            if (substr($event->data, $len) == 'new') {
                $this->lookupNew();
            }

            if (substr($event->data, $len) == 'save') {
                $this->lookupSave();
            }

            if (substr($event->data, $len) == 'delete') {
                $this->lookupDelete();
            }

        } catch (StructException $e) {
            http_status(500);
            header('Content-Type: text/plain');
            echo $e->getMessage();
        }
    }

    /**
     * Deletes a lookup row
     */
    protected function lookupDelete()
    {
        global $INPUT;
        $tablename = $INPUT->str('schema');
        $pid = $INPUT->int('pid');
        if (!$pid) {
            throw new StructException('No pid given');
        }
        if (!$tablename) {
            throw new StructException('No schema given');
        }
        action_plugin_struct_inline::checkCSRF();

        $schemadata = AccessTable::byTableName($tablename, $pid);
        if (!$schemadata->getSchema()->isEditable()) {
            throw new StructException('lookup delete error: no permission for schema');
        }
        $schemadata->clearData();
    }

    /**
     * Save one new lookup row
     */
    protected function lookupSave()
    {
        global $INPUT;
        $tablename = $INPUT->str('schema');
        $data = $INPUT->arr('entry');
        action_plugin_struct_inline::checkCSRF();

        // create a new row based on the original aggregation config for the new pid
        $access = AccessTable::byTableName($tablename, 0, 0);

        /** @var helper_plugin_struct $helper */
        $helper = plugin_load('helper', 'struct');
        $helper->saveLookupData($access, $data);

        $pid = $access->getPid();
        $config = json_decode($INPUT->str('searchconf'), true);
        $config['filter'] = array(array('%rowid%', '=', $pid, 'AND'));
        $lookup = new LookupTable(
            '', // current page doesn't matter
            'xhtml',
            new Doku_Renderer_xhtml(),
            new SearchConfig($config)
        );

        echo $lookup->getFirstRow();
    }

    /**
     * Create the Editor for a new lookup row
     */
    protected function lookupNew()
    {
        global $INPUT;
        global $lang;
        $tablename = $INPUT->str('schema');

        $schema = new Schema($tablename);
        if (!$schema->isEditable()) {
            return;
        } // no permissions, no editor

        echo '<div class="struct_entry_form">';
        echo '<fieldset>';
        echo '<legend>' . $this->getLang('lookup new entry') . '</legend>';
        /** @var action_plugin_struct_edit $edit */
        $edit = plugin_load('action', 'struct_edit');
        foreach ($schema->getColumns(false) as $column) {
            $label = $column->getLabel();
            $field = new Value($column, '');
            echo $edit->makeField($field, "entry[$label]");
        }
        formSecurityToken(); // csrf protection
        echo '<input type="hidden" name="call" value="plugin_struct_lookup_save" />';
        echo '<input type="hidden" name="schema" value="' . hsc($tablename) . '" />';

        echo '<button type="submit">' . $lang['btn_save'] . '</button>';

        echo '<div class="err"></div>';
        echo '</fieldset>';
        echo '</div>';

    }

}
