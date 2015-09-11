/*global ko, Router */
(function () {
	'use strict';
	
	var ENTER_KEY = 13;
	var ESCAPE_KEY = 27;

	// A factory function we can use to create binding handlers for specific
	// keycodes.
	function keyhandlerBindingFactory(keyCode) {
		return {
			init: function (element, valueAccessor, allBindingsAccessor, data, bindingContext) {
				var wrappedHandler, newValueAccessor;

				// wrap the handler with a check for the enter key
				wrappedHandler = function (data, event) {
					if (event.keyCode === keyCode) {
						valueAccessor().call(this, data, event);
					}
				};

				// create a valueAccessor with the options that we would want to pass to the event binding
				newValueAccessor = function () {
					return {
						keyup: wrappedHandler
					};
				};

				// call the real event binding's init function
				ko.bindingHandlers.event.init(element, newValueAccessor, allBindingsAccessor, data, bindingContext);
			}
		};
	}
	
	// a custom binding to handle the enter key
	ko.bindingHandlers.enterKey = keyhandlerBindingFactory(ENTER_KEY);

	// another custom binding, this time to handle the escape key
	ko.bindingHandlers.escapeKey = keyhandlerBindingFactory(ESCAPE_KEY);

	// wrapper to hasFocus that also selects text and applies focus async
	ko.bindingHandlers.selectAndFocus = {
		init: function (element, valueAccessor, allBindingsAccessor, bindingContext) {
			ko.bindingHandlers.hasFocus.init(element, valueAccessor, allBindingsAccessor, bindingContext);
			ko.utils.registerEventHandler(element, 'focus', function () {
				element.focus();
			});
		},
		update: function (element, valueAccessor) {
			ko.utils.unwrapObservable(valueAccessor()); // for dependency
			// ensure that element is visible before trying to focus
			setTimeout(function () {
				ko.bindingHandlers.hasFocus.update(element, valueAccessor);
			}, 0);
		}
	};
	
	ko.bindingHandlers.dtpicker = {
		init: function (element, valueAccessor, allBindingsAccessor) {
			var options = allBindingsAccessor().datepickerOptions || {};
			$(element).datepicker(options);

			ko.utils.registerEventHandler(element, "change", function () {
				var observable = valueAccessor();
				var rawDate = $(element).datepicker("getDate");
				var day = rawDate.getDate();
				var month = rawDate.getMonth()+1;
				var year = rawDate.getFullYear();
				var dateFull = month + '/' + day + '/' + year;
				observable(dateFull);
			});

			//handle disposal (if KO removes by the template binding)
			ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
				$(element).datepicker("destroy");
			});

		},
		update: function(element, valueAccessor) {
			var value = ko.utils.unwrapObservable(valueAccessor()),
				$el = $(element);
				
			//handle date data coming via json from Microsoft
			if (String(value).indexOf('/Date(') == 0) {
				value = new Date(parseInt(value.replace(/\/Date\((.*?)\)\//gi, "$1")));
			}
			var current = $el.datepicker("getDate");

			if (value - current !== 0) {
				$el.datepicker("setDate", value);
			}
		}	
	};

	// task class declaration
	function todoTask(task, date, dat){
		var self = this;
		//test for saved data
		if(dat == null){
			self.completion = ko.observable(false);
			self.completeContent = ko.observable("&nbsp;");
		}
		else{
			console.log(dat);
			self.completion = ko.observable(dat.completion);
			self.completeContent = ko.observable(dat.completeContent);
		}
		
		self.task = ko.observable(task);
		
		self.editing = ko.observable(false);
	
		self.date = ko.observable(date);
		
		//task completion toggle
		self.completeTask = function(){
			if(self.completion() == false){
				self.completion(true);
				//set tick symbol to show completed.
				self.completeContent("&#10004;");
			}
			else{
				self.completion(false);
				self.completeContent("&nbsp;");
			}
		};
	}


	function taskViewModel(){
		var self = this;
		
		self.tasks = ko.observableArray([]);
		self.saveText = ko.observable('');
		// task array and defaults
		if(typeof(Storage) !== undefined){
			if(localStorage.todoTasks !== undefined){
				var mappedTasks = $.map(JSON.parse(localStorage.todoTasks), function(item){
					var pack = {
						'completion': item.completion,
						'completeContent': item.completeContent
					};
					return new todoTask(item.task, (item.date), pack);
				});
				self.tasks(mappedTasks);
			}
		}
		
		var dateSort = function(l, r) { 
			var ldate = Date.parse(l.date());
			var rdate = Date.parse(r.date());
			return (ldate == rdate) ? 0 :  (ldate > rdate) ? 1 : -1;
		};
		
		self.tasks.sort(dateSort);
		
		self.stateChanged = function(value){
			self.tasks.sort(dateSort);
			self.saveState();
		};
		
		// Input Data - Observable so that it can be reset
		self.newTask = ko.observable('');
		
		self.addTask = function() {
			
			var todo = self.newTask();
			todo = todo.trim();
			if(todo === "") {
				return;
			}
			var rawDate = new Date();
			var day = rawDate.getDate();
			var month = rawDate.getMonth()+1;
			var year = rawDate.getFullYear();
			var dateFull = month + '/' + day + '/' + year;
			
			self.tasks.push(new todoTask(self.newTask(), dateFull));
			self.tasks.sort(dateSort);
			self.newTask('');
		}
		
		self.removeTask = function(){
			self.tasks.remove(this);
		}
		
		self.editTask = function (todo) {
				todo.editing(true);
				todo.oldTask = todo.task();
		};
		
		self.saveEditing = function (todo) {
				var title = todo.task();
				var trimmedTitle = title.trim();
				todo.task(trimmedTitle);				
				todo.editing(false);
		};

		self.saveState = function(){
			if(typeof(Storage) !== "undefined"){
				//local storage support
				var data = $.map(self.tasks(), function(item){
					
					var pack = {
						'task': item.task(),
						'date': item.date(),
						'completion': item.completion(),
						'completeContent': item.completeContent()
					};
					return pack;
				});
				localStorage.todoTasks = JSON.stringify(data);
			}
			else{
				//error
			}
		}
		
		self.completedTasks = ko.computed(function(){
			var total = 0;
			var i = 0;
			for (i; i < self.tasks().length; i++){
				if(self.tasks()[i].completion() == false){
					total++;	
				}
			}
			self.stateChanged();
			return total;
		});
	}

	ko.applyBindings(new taskViewModel());

}());
