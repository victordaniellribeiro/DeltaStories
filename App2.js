Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    launch: function() {
        var panel = Ext.create('Ext.panel.Panel', {
            layout: 'hbox',
            itemId: 'parentPanel',
            componentCls: 'panel',
            items: [{
                xtype: 'panel',
                title: 'Artifacts updated in the last two days',
                width: 600,
                itemId: 'childPanel1'
            }, {
                xtype: 'panel',
                title: 'Last Revision',
                width: 600,
                itemId: 'childPanel2'
            }],
        });

        this.add(panel);

        this.down('#childPanel2').add({
            id: 'c',
            padding: 10,
            maxWidth: 600,
            maxHeight: 400,
            overflowX: 'auto',
            overflowY: 'auto',
            html: 'No artifact is selected'
        });

        var startDate = new Date(new Date() - 86400000 * 2).toISOString(); //in the last 2 days; millisecondsInDay = 86400000

        var filters = [{
            property: 'LastUpdateDate',
            operator: '>=',
            value: startDate
        }];
        var artifacts = Ext.create('Rally.data.wsapi.artifact.Store', {
            models: ['UserStory', 'Defect', 'TestCase'],
            fetch: ['Owner', 'FormattedID', 'Name', 'ScheduleState', 'RevisionHistory', 'Revisions', 'Description', 'CreationDate', 'User'],
            autoLoad: true,
            filters: filters,
            listeners: {
                load: this._onDataLoaded,
                scope: this
            }
        });
    },

    _onDataLoaded: function(store, data) {
        this._customRecords = [];
        _.each(data, function(artifact, index) {
            this._customRecords.push({
                _ref: artifact.get('_ref'),
                FormattedID: artifact.get('FormattedID'),
                Name: artifact.get('Name'),
                RevisionID: Rally.util.Ref.getOidFromRef(artifact.get('RevisionHistory')),
                RevisionNumber: 'not loaded'
            });
        }, this);
        this._createGrid(store, data);
    },

    _createGrid: function(store, data) {
        var that = this;
        var g = Ext.create('Rally.ui.grid.Grid', {
            itemId: 'g',
            store: store,
            enableEditing: false,
            showRowActionsColumn: false,
            columnCfgs: [{
                text: 'Formatted ID',
                dataIndex: 'FormattedID'
            }, {
                text: 'Name',
                dataIndex: 'Name'
            }, {
                text: 'ScheduleState',
                dataIndex: 'ScheduleState'
            }, {
                text: 'Last Revision',
                renderer: function(v, m, r) {
                    var id = Ext.id();
                    Ext.defer(function() {
                        Ext.widget('button', {
                            renderTo: id,
                            text: 'see',
                            width: 50,
                            handler: function() {
                                that._getRevisionHistory(data, r.data);
                            }
                        });
                    }, 50);
                    return Ext.String.format('<div id="{0}"></div>', id);
                }

            }],
            height: 400,
        });
        this.down('#childPanel1').add(g);
    },

    _getRevisionHistory: function(artifactList, artifact) {
        this._artifact = artifact;
        this._revisionModel = Rally.data.ModelFactory.getModel({
            type: 'RevisionHistory',
            scope: this,
            success: this._onModelCreated
        });

    },
    _onModelCreated: function(model) {
        model.load(Rally.util.Ref.getOidFromRef(this._artifact.RevisionHistory._ref), {
            scope: this,
            success: this._onModelLoaded
        });

    },

    _onModelLoaded: function(record, operation) {
        record.getCollection('Revisions').load({
            fetch: true,
            scope: this,
            callback: function(revisions, operation, success) {
                this._onRevisionsLoaded(revisions, record);
            }
        });
    },

    _onRevisionsLoaded: function(revisions, record) {
        var lastRev = _.first(revisions).data;
        this._displayLastRevision(lastRev.Description, lastRev.RevisionNumber, lastRev.CreationDate, lastRev.User);

    },

    _displayLastRevision: function(desc, num, date, author) {
        Ext.getCmp('c').update('<b>' + this._artifact.FormattedID + '</b><br/><b>Revision CreationDate: </b>' + date + '<br /><b>Description:</b>' + desc + '<br /><b>Revision Number:</b>' + num + '<br /><b>Author:</b>' + author._refObjectName);

    }
});