Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    launch: function() {
        //Write app code here

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
            componentCls: 'panel',
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

        this.add(datePanel);
        datePanel.add(initDatePicker);
        datePanel.add(endDatePicker);
        datePanel.add(releaseComboBox);
        datePanel.add(searchButton);

        this.add(mainPanel);

    },

    _doSearch: function(initDate, endDate, project, releaseId) {
    	console.log('looking for', initDate, endDate, project);

    	if (initDate == '' || endDate == '') {
    		return;
    	}
    	console.log('loading init stories');

    	Ext.create('Rally.data.lookback.SnapshotStore', {
            fetch    : ['Name', 'FormattedID', 'LeafStoryPlanEstimateTotal', "State", "_ValidFrom", "_ValidTo", 'PlanEstimate', "ScheduleState"],
            autoLoad: true,
            filters  : [
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
	            },
	        ],
	        sorters : [
		        {
		            property: 'ObjectID',
		            direction: 'ASC'
	        	}
	        ],

            hydrate: ['ScheduleState', 'State'],

            listeners: {
                load: function(store, data, success) {
                	this._onStoriesLoaded(store, data, '#childPanel1');
                },
                scope: this
            }
        });


        console.log('loading end stories');
    	Ext.create('Rally.data.lookback.SnapshotStore', {
            fetch    : ['Name', 'FormattedID', 'LeafStoryPlanEstimateTotal', "State", "_ValidFrom", "_ValidTo", 'PlanEstimate', "ScheduleState"],
            autoLoad: true,
            filters  : [
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
	            },
	        ],
	        sorters : [
		        {
		            property: 'ObjectID',
		            direction: 'ASC'
	        	}
	        ],

            hydrate: ['ScheduleState', 'State'],

            listeners: {
                load: function(store, data, success) {
                	this._onStoriesLoaded(store, data, '#childPanel2');
                },
                scope: this
            }
        });
    },

     //make grid of stories 
    _onStoriesLoaded: function(store, records, panel) {
        var that = this;
        var stories = [];
        var id;

        _.each(records, function(record) {
            id = record.get('FormattedID');
            
            stories.push({
                Name: record.get('Name'),
                FormattedID: id,
                PlanEstimate: record.get('PlanEstimate'),
                ScheduleState: record.get('ScheduleState'),
                State: record.get('State'),
                LeafStoryPlanEstimateTotal: record.get('LeafStoryPlanEstimateTotal')
                
            });
        });
        
        var myStore = Ext.create('Rally.data.custom.Store', {
        	data: stories,
        	pageSize: 1000
		});		

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
                    dataIndex: 'FormattedID'
                },
                {
                    text: 'Name', 
                    dataIndex: 'Name',
                    flex: 1
                },
                {
                    text: 'Plan Estimate', 
                    dataIndex: 'LeafStoryPlanEstimateTotal'
                },
                {
                    text: 'State', 
                    dataIndex: 'State'
                }
            ] 
        	});

    	var gridHolder = this.down(panel);
        gridHolder.removeAll(true);
        gridHolder.add(grid);
        grid.getView().addRowCls(3, 'error');
     }
});
