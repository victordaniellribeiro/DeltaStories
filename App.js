Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    launch: function() {
        //API Docs: https://help.rallydev.com/apps/2.1/doc/    


        var context =  this.getContext();
        var project = context.getProject()['ObjectID'];
        var initDate = '';
        var endDate = '';
        var releaseId = '';
        console.log(project);
        var that = this;

        var initDatePicker = Ext.create('Ext.form.field.Date', {
        	fieldLabel: 'From:',
        	listeners : {
        		select: function(picker, date) {
        			console.log(date);
        			initDate = date.toISOString();
        		}
        	}
        });

        var endDatePicker = Ext.create('Ext.form.field.Date', {
        	fieldLabel: 'To:',
        	listeners : {
        		select: function(picker, date) {
        			console.log(date);
        			endDate = date.toISOString();
        		}
        	}
        });

        var datePanel = Ext.create('Ext.panel.Panel', {
            type: 'vbox',
            align: 'stretch',
            padding: 5,
            itemId: 'datePanel',
            componentCls: 'panel'            
        });

        var releaseComboBox = Ext.create('Rally.ui.combobox.ReleaseComboBox',{
        	itemId : 'releaseComboBox',
        	//allowClear: true,
        	scope: this,
        	listeners : {
        		ready: function(combobox) {
        			releaseId = combobox.getRecord().get('ObjectID');
        		},
	        	select: function(combobox, records, opts) {
	        		releaseId = combobox.getRecord().get('ObjectID');
	        	}
	        }

        });

        var searchButton = Ext.create('Rally.ui.Button', {
        	text: 'Search',
        	scope: this,
        	handler: function() {
        		//handles search
        		console.log(initDate, endDate);
        		this._doSearch(initDate, endDate, project, releaseId);
        	}
        });

        var mainPanel = Ext.create('Ext.panel.Panel', {
            layout: 'hbox',
            padding: 5,
            itemId: 'parentPanel',
            //componentCls: 'panel',
            cls: 'attention-row',
            items: [
                {
	                xtype: 'panel',
	                title: 'Stories At Start Date',
	                flex: 1,
	                itemId: 'childPanel1'
                },
                {
                	xtype:'splitter' 
                },
                {
	                xtype: 'panel',
	                title: 'Stories At End Date',
	                flex: 1,
	                itemId: 'childPanel2'
                }
            ],
        });


        this.myMask = new Ext.LoadMask({
		    msg    : 'Please wait...',
		    target : mainPanel
		});

        this.add(datePanel);
        datePanel.add(initDatePicker);
        datePanel.add(endDatePicker);
        datePanel.add(releaseComboBox);
        datePanel.add(searchButton);

        this.add(mainPanel);

    },

    _doSearch: function(initDate, endDate, project, releaseId) {
    	console.log('looking for', initDate, endDate, project);

    	//set loading message.

    	if (initDate == '' || endDate == '') {
    		return;
    	}

    	this.filtersInit = [
    		{
                property : '__At',
                value    : initDate
            },
            
            {
                property : '_TypeHierarchy',
                value    : 'PortfolioItem/Feature'
            },
           	{
                property : '_ProjectHierarchy',
                value: project
            },	            

            {
                property : 'Release',
                value: releaseId
            }	
    	];

    	this.filtersEnd = [
    		{
                property : '__At',
                value    : endDate
            },
            
            {
                property : '_TypeHierarchy',
                value    : 'PortfolioItem/Feature'
            },
           	{
                property : '_ProjectHierarchy',
                value: project
            },
            {
                property : 'Release',
                value: releaseId
            }
    	];

    	this.myMask.show();

    	this._loadInitData();
    },

    _loadInitData: function () {
    	console.log('loading init stories');
    	var store = Ext.create('Rally.data.lookback.SnapshotStore', {
            fetch    : ['Name', 'FormattedID', 'LeafStoryPlanEstimateTotal', "State", "_ValidFrom", "_ValidTo", 'PlanEstimate', "ScheduleState"],
            filters : this.filtersInit,
            autoLoad: true,
	        sorters : [
		        {
		            property: 'ObjectID',
		            direction: 'ASC'
	        	}
	        ],

            hydrate: ['ScheduleState', 'State'],

            listeners: {
                load: function(store, data, success) {
                	this.initItems = data;
                	this._loadEndData();
                },
                scope: this
            }
        });

        //store.addFilter(this.filtersInit);
    },

    _loadEndData: function() {
    	console.log('loading end stories');
        var store2 = Ext.create('Rally.data.lookback.SnapshotStore', {
            fetch    : ['Name', 'FormattedID', 'LeafStoryPlanEstimateTotal', "State", "_ValidFrom", "_ValidTo", 'PlanEstimate', "ScheduleState"],
            filters : this.filtersEnd,
            autoLoad: true,
	        sorters : [
		        {
		            property: 'ObjectID',
		            direction: 'ASC'
	        	}
	        ],

            hydrate: ['ScheduleState', 'State'],

            listeners: {
                load: function(store, data, success) {
                	this.endItems = data;
                	this._onStoriesLoaded();
                	this.myMask.hide();
                },
                scope: this
            }
        });
    },

     //make grid of stories 
    _onStoriesLoaded: function(records, panel) {
        var that = this;
        var initFeatures = [];
        var endFeatures = [];
        var initIds = [];
        var endIds = [];
        var id;

		_.each(this.initItems, function(record) {
        	initIds.push(record.get('ObjectID'));
        });
        console.log('initIds', initIds);

        _.each(this.endItems, function(record) {
        	endIds.push(record.get('ObjectID'));
        });
        console.log('endIds', endIds);


        //find features not planned / items on endItems that were not included in initItems
        _.each(this.endItems, function(record) {
            id = record.get('ObjectID');
            var planned = true;

            console.log('checking if', id, 'exists in', initIds);
    		if (!Ext.Array.contains(initIds, id)) {
    			planned = false;
    		}
            
            endFeatures.push({
                Name: record.get('Name'),
                FormattedID: record.get('FormattedID'),
                PlanEstimate: record.get('PlanEstimate'),
                ScheduleState: record.get('ScheduleState'),
                State: record.get('State'),
                Planned: planned,
                LeafStoryPlanEstimateTotal: record.get('LeafStoryPlanEstimateTotal')
                
            });
        }, this);


        //find feature that were not delivered / items on initItems that were not included in endItems.
         _.each(this.initItems, function(record) {
            id = record.get('ObjectID');
            var removed = false;

            console.log('checking if', id, 'exists in', endIds);
    		if (!Ext.Array.contains(endIds, id)) {
    			removed = true;
    		} 
            
            initFeatures.push({
                Name: record.get('Name'),
                FormattedID: record.get('FormattedID'),
                PlanEstimate: record.get('PlanEstimate'),
                ScheduleState: record.get('ScheduleState'),
                State: record.get('State'),
                Removed: removed,
                LeafStoryPlanEstimateTotal: record.get('LeafStoryPlanEstimateTotal')
                
            });
        }, this);

        
        var initStore = Ext.create('Rally.data.custom.Store', {
        	data: initFeatures,
        	pageSize: 1000
		});

		var endStore = Ext.create('Rally.data.custom.Store', {
        	data: endFeatures,
        	pageSize: 1000
		});

		this._createInitGrid(initStore, '#childPanel1');
		this._createEndGrid(endStore, '#childPanel2');
     },

     _createInitGrid: function(myStore, panel) {
		var grid = Ext.create('Rally.ui.grid.Grid', {
			showRowActionsColumn: false,
			showPagingToolbar: false,
			enableEditing: false,
    		itemId : ''+panel+'Grid',
    		id : ''+panel+'Grid',
    		store: myStore,

    		columnCfgs: [
                {
                    text: 'ID', 
                    dataIndex: 'FormattedID',
                    tdCls: 'x-change-cell'
                },
                {
                    text: 'Name', 
                    dataIndex: 'Name',
                    flex: 1,
                    tdCls: 'x-change-cell'
                },
                {
                    text: 'Plan Estimate', 
                    dataIndex: 'LeafStoryPlanEstimateTotal',
                    tdCls: 'x-change-cell'
                },
                {
                    text: 'State', 
                    dataIndex: 'State',
                    tdCls: 'x-change-cell'
                }
            ],

            viewConfig: {
			    getRowClass: function(record, rowIndex, rowParams, store) {
			    	if (record.get('Removed') == true) {
			    		console.log('changing css for records', record, 'index', rowIndex);
			    		return 'attention';
			    	}
    			}
			}
        	});

    	var gridHolder = this.down(panel);
        gridHolder.removeAll(true);
        gridHolder.add(grid);
     },

     _createEndGrid: function(myStore, panel) {
		var grid = Ext.create('Rally.ui.grid.Grid', {
			showRowActionsColumn: false,
			showPagingToolbar: false,
			enableEditing: false,
    		itemId : ''+panel+'Grid',
    		id : ''+panel+'Grid',
    		store: myStore,
    		columnCfgs: [
                {
                    text: 'ID', 
                    dataIndex: 'FormattedID',
                    tdCls: 'x-change-cell'
                },
                {
                    text: 'Name', 
                    dataIndex: 'Name',
                    flex: 1,
                    tdCls: 'x-change-cell'
                },
                {
                    text: 'Plan Estimate', 
                    dataIndex: 'LeafStoryPlanEstimateTotal',
                    tdCls: 'x-change-cell'
                },
                {
                    text: 'State', 
                    dataIndex: 'State',
                    tdCls: 'x-change-cell'
                }
            ],
            viewConfig: {
			    getRowClass: function(record, rowIndex, rowParams, store) {
			    	if (record.get('Planned') == false) {
			    		console.log('changing css for records', record, 'index', rowIndex);
			    		return 'new-feature';
			    	}
    			}
			}
        	});

    	var gridHolder = this.down(panel);
        gridHolder.removeAll(true);
        gridHolder.add(grid);
     },
});
