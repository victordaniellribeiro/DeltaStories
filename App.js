Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    launch: function() {
        //API Docs: https://help.rallydev.com/apps/2.1/doc/    
        var context =  this.getContext();
        var project = context.getProject()['ObjectID'];        
        //var project = 90681998188;

        var initDate = '';
        var endDate = '';

        //global releases ids
        this.releases = [];

        var baseReleaseName = '';
        var baseReleaseId = '';

        console.log('project: ', project);
        var that = this;

        var initDatePicker = Ext.create('Ext.form.field.Date', {
        	fieldLabel: 'From:',
        	listeners : {
        		select: function(picker, date) {
        			//console.log(date);
        			initDate = date.toISOString();
        		}
        	}
        });

        var endDatePicker = Ext.create('Ext.form.field.Date', {
        	fieldLabel: 'To:',
        	listeners : {
        		select: function(picker, date) {
        			//console.log(date);
        			endDate = date.toISOString();
        		}
        	}
        });

		var releaseComboBox = Ext.create('Rally.ui.combobox.ReleaseComboBox',{
        	itemId : 'releaseComboBox',
        	//allowClear: true,
        	scope: this,
        	listeners : {
        		ready: function(combobox) {
        			baseReleaseId = combobox.getRecord().get('ObjectID');
        			baseReleaseName = combobox.getRecord().get('Name');        			
        		},
	        	select: function(combobox, records, opts) {
        			baseReleaseId = combobox.getRecord().get('ObjectID');
        			baseReleaseName = combobox.getRecord().get('Name');
	        	}
	        }

        });

        var searchButton = Ext.create('Rally.ui.Button', {
        	text: 'Search',
        	margin: '10 10 10 100',
        	scope: this,
        	handler: function() {
        		//handles search
        		//console.log(initDate, endDate);
        		this._doSearch(initDate, endDate, project, baseReleaseName, baseReleaseId);
        	}
        });


        var datePanel = Ext.create('Ext.panel.Panel', {
            layout: 'hbox',
            align: 'stretch',
            padding: 5,
            itemId: 'datePanel',
            items: [
                {
	                xtype: 'panel',
	                flex: 1,
	                itemId: 'filterPanel'
                },
                {
	                xtype: 'panel',
	                flex: 1,
	                itemId: 'tooltipPanel'
                }
            ]
                       
        });


        var mainPanel = Ext.create('Ext.panel.Panel', {
            layout: 'hbox',
            padding: 5,
            itemId: 'parentPanel',
            items: [
                {
	                xtype: 'panel',
	                title: 'Features At Start Date',
	                flex: 1,
	                itemId: 'childPanel1'
                },           {
                	xtype:'splitter' 
                },
                {
	                xtype: 'panel',
	                title: 'Features At End Date',
	                flex: 1,
	                itemId: 'childPanel2'
                }
            ]
        });


        this.myMask = new Ext.LoadMask({
		    msg    : 'Please wait...',
		    target : mainPanel
		});


        this.add(datePanel);
        datePanel.down('#filterPanel').add(initDatePicker);
        datePanel.down('#filterPanel').add(endDatePicker);
        datePanel.down('#filterPanel').add(releaseComboBox);
        datePanel.down('#filterPanel').add(searchButton);

        datePanel.down('#tooltipPanel').add({
            id: 'tooltipContent1',
            padding: 5,
            height: 45,
            overflowX: 'auto',
            overflowY: 'auto',
            html: '<div style= "clear:both">'+
            		'<div style="background-color:#cdf9c2; width:20px; height:20px; margin:5px; float:left;"></div>'+
            		'<div style="height:20px; margin:5px; float:left;">Features present at start date and at the end date with state <b>Staging</b> or <b>Done</b>.</div>'+
            	  '</div>'
        },{
            id: 'tooltipContent2',
            padding: 5,
            height: 45,
            overflowX: 'auto',
            overflowY: 'auto',
            html: '<div style= "clear:both">'+
            		'<div style="background-color:#c2d7f9; width:20px; height:20px; margin:5px; float:left;"></div>'+
            		'<div style="height:20px; margin:5px; float:left;">Features absent at the start date and present at end date.</div>'+
            	  '</div>'
        },{
            id: 'tooltipContent3',
            padding: 5,
            height: 45,
            overflowX: 'auto',
            overflowY: 'auto',
            html: '<div style= "clear:both">'+
            		'<div style="background-color:#ffe2e2; width:20px; height:20px; margin:5px; float:left;"></div>'+
            		'<div style="height:20px; margin:5px; float:left;">Features present at the start date, but absent at end date.</div>'+
            	  '</div>'
        });

        this.add(mainPanel);

    },

    _doSearch: function(initDate, endDate, projectId, baseReleaseName, baseReleaseId) {
    	//gather all releases 
    	console.log('parent release name: ', baseReleaseName);
    	console.log('looking for:', initDate, endDate, projectId);


    	if (initDate == '' || endDate == '') {
    		return;
    	}

    	this.myMask.show();

    	//clear relase filter:
    	this.releases = [];


    	//this recovers all releases from a parent project given the release name.
    	Ext.create('Rally.data.wsapi.Store', {
		    model: 'Release',
		    autoLoad: true,
		    context: {
		        projectScopeUp: false,
		        projectScopeDown: true,
		        project: null //null to search all workspace
		    },
		    filters: [
		            {
		                property: 'Project.parent.ObjectID',
		                value: projectId
		            },
		            {
		                property: 'name',
		                value: baseReleaseName
		            }
	        ],
		    listeners: {
		        load: function(store, data, success) {
		            //console.log('Store:', store);
		            //console.log('Data:', data);

		            //this checks if the project is a leaf. 
		            //will return 0 child releases if so. else will return all releases id.
		            if (data.length > 0) {
		            	console.log('multiple releases found:', data);
			            var localReleases = [];

			            _.each(data, function(record) {
				        	localReleases.push(record.get('ObjectID'));
				        });

				        this.releases = localReleases;
				        console.log('releases: ', this.releases);
				    } else {
				    	console.log('single release found, using baseReleaseId:', baseReleaseId);
				    	this.releases = [baseReleaseId];
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
			                value: projectId
			            },	            

			            {
			                property : 'Release',
			                operator: 'in',
			                value: this.releases
			                //value: releaseId
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
			                value: projectId
			            },
			            {
			                property : 'Release',
			                operator: 'in',
			                value: this.releases
			            }
			    	];

			    	this._loadInitData();
		        },
		        scope: this
		    },
		    fetch: ['Description', 'Name', 'ObjectID']
		});
    },

    _loadInitData: function () {
    	console.log('loading init stories');
    	//console.log('filters:', this.filtersInit);
    	var store = Ext.create('Rally.data.lookback.SnapshotStore', {
            fetch    : ['Name', 'FormattedID', 'LeafStoryPlanEstimateTotal', 'State', 'PercentDoneByStoryPlanEstimate', "_ValidFrom", "_ValidTo"],
            filters : this.filtersInit,
            autoLoad: true,
	        sorters : [
		        {
		            property: 'ObjectID',
		            direction: 'ASC'
	        	}
	        ],

            hydrate: ['State'],

            listeners: {
                load: function(store, data, success) {
                	//console.log('Init Store', store);
                	this.initItems = data;
                	this._loadEndData();
                },
                scope: this
            }
        });
    },

    _loadEndData: function() {
    	console.log('loading end stories');
        var store2 = Ext.create('Rally.data.lookback.SnapshotStore', {
            fetch    : ['Name', 'FormattedID', 'LeafStoryPlanEstimateTotal', 'State', 'PercentDoneByStoryPlanEstimate', "_ValidFrom", "_ValidTo"],
            filters : this.filtersEnd,
            autoLoad: true,
	        sorters : [
		        {
		            property: 'ObjectID',
		            direction: 'ASC'
	        	}
	        ],

            hydrate: ['State'],

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
    _onStoriesLoaded: function() {
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
            var id = record.get('ObjectID');
            var state = record.get('State');

            var planned = true;
            var completed = false;

            //console.log('checking if', id, 'exists in', initIds);
    		if (!Ext.Array.contains(initIds, id)) {
    			planned = false;
    		}

    		if (state == 'Done' || state == 'Staging') {
    			completed = true;
    		}

            endFeatures.push({
            	_ref: '/portfolioitem/feature/' + id,
                Name: record.get('Name'),
                FormattedID: record.get('FormattedID'),
                State: record.get('State'),
                PercentDoneByStoryPlanEstimate: record.get('PercentDoneByStoryPlanEstimate'),
                Planned: planned,
                Completed: completed,
                LeafStoryPlanEstimateTotal: record.get('LeafStoryPlanEstimateTotal')
                
            });
        }, this);


        //find feature that were not delivered / items on initItems that were not included in endItems.
         _.each(this.initItems, function(record) {
            id = record.get('ObjectID');
            var removed = false;

            //console.log('checking if', id, 'exists in', endIds);
    		if (!Ext.Array.contains(endIds, id)) {
    			removed = true;
    		}

            initFeatures.push({
            	_ref: '/portfolioitem/feature/' + id,
                Name: record.get('Name'),
                FormattedID: record.get('FormattedID'),
                State: record.get('State'),
                PercentDoneByStoryPlanEstimate: record.get('PercentDoneByStoryPlanEstimate'),
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
    		store: myStore,

    		columnCfgs: [
                {
                	xtype: 'templatecolumn',
                    text: 'ID',
                    dataIndex: 'FormattedID',
                    tdCls: 'x-change-cell',
                    tpl: Ext.create('Rally.ui.renderer.template.FormattedIDTemplate')
                },
                {
                    text: 'Name', 
                    dataIndex: 'Name',
                    flex: 1,
                    tdCls: 'x-change-cell'
                },
                {
                    text: 'Leaf Story Plan Estimate Total', 
                    dataIndex: 'LeafStoryPlanEstimateTotal',
                    tdCls: 'x-change-cell'
                },
                {
                    text: 'Feature State', 
                    dataIndex: 'State',
                    tdCls: 'x-change-cell'
                },
                {
                	xtype: 'templatecolumn',
                    text: 'Percent Done By Story Plan Estimate', 
                    dataIndex: 'PercentDoneByStoryPlanEstimate',
                    tpl: Ext.create('Rally.ui.renderer.template.progressbar.PercentDoneByStoryPlanEstimateTemplate', {
                    	isClickable: false,
                    	showDangerNotificationFn : function() {
                    		return false;
                    	}
                    })                 
                }
            ],

            viewConfig: {
			    getRowClass: function(record, rowIndex, rowParams, store) {
			    	if (record.get('Removed') == true) {
			    		//console.log('changing css for records', record, 'index', rowIndex);
			    		return 'attention';
			    	}
    			}
			}
        	});

		this.add(grid);
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
                	xtype: 'templatecolumn',
                    text: 'ID', 
                    dataIndex: 'FormattedID',
                    tdCls: 'x-change-cell',
                    tpl: Ext.create('Rally.ui.renderer.template.FormattedIDTemplate')
                },
                {
                    text: 'Name', 
                    dataIndex: 'Name',
                    flex: 1,
                    tdCls: 'x-change-cell'
                },
                {
                    text: 'Leaf Story Plan Estimate Total', 
                    dataIndex: 'LeafStoryPlanEstimateTotal',
                    tdCls: 'x-change-cell'
                },
                {
                    text: 'Feature State', 
                    dataIndex: 'State',
                    tdCls: 'x-change-cell'
                },
                {
                    xtype: 'templatecolumn',
                    text: 'Percent Done By Story Plan Estimate', 
                    dataIndex: 'PercentDoneByStoryPlanEstimate',
                    tpl: Ext.create('Rally.ui.renderer.template.progressbar.PercentDoneByStoryPlanEstimateTemplate', {
                    	isClickable: false,
                    	showDangerNotificationFn : function() {
                    		return false;
                    	}
                    })
                }
            ],
            viewConfig: {
			    getRowClass: function(record, rowIndex, rowParams, store) {
			    	if (record.get('Planned') == false) {
			    		//console.log('changing css for records', record, 'index', rowIndex);
			    		return 'new-feature';
			    	}
			    	if (record.get('Completed')  == true) {
			    		return 'completed';
			    	}
    			}
			}
        	});

    	var gridHolder = this.down(panel);
        gridHolder.removeAll(true);
        gridHolder.add(grid);
     },
});
