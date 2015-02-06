define([
  'angular',
  'app',
  'lodash',
  'require',
  'components/panelmeta',
],
function (angular, app, _, require, PanelMeta) {
  'use strict';

  var module = angular.module('grafana.panels.text', []);
  app.useModule(module);

  var converter;

  module.controller('text', function($scope, templateSrv, $sce, panelSrv) {

    $scope.panelMeta = new PanelMeta({
      description : "A static text panel that can use plain text, markdown, or (sanitized) HTML"
    });

    $scope.panelMeta.addEditorTab('Edit text', 'app/panels/text/editor.html');

    // Set and populate defaults
    var _d = {
      title         : 'default title',
      mode          : "markdown", // 'html', 'markdown', 'text'
      content       : "",
      style: {},
    };

    _.defaults($scope.panel, _d);

    $scope.init = function() {
      panelSrv.init($scope);
      $scope.ready = false;
      $scope.$on('refresh', $scope.render);
      $scope.render();
    };

    $scope.listHtmlTemplates = function(){

        // var dir = "html_templates/";
        // var templates = [];
        // var fileExtension = ".html";

        // $.ajax({

        //     url: dir,
        //     async: false,  
        //     success: function (data) {

        //         console.log(data);
        //         //List all html file names in the page
        //         $(data).find("a:contains(" + fileExtension + ")").each(function () {
        //             var filename = this.href.replace(window.location.host, "").replace("http:///", "").replace(".html", "");
        //             templates.push(filename);
        //             console.log(filename);
        //         });
        //     }
        // });

        var templates = ['dashboard_artists',
                     'perfomance',
                     'scorecard',
                     'scorecard_active_time',
                     'scorecard_challenges_missions',
                     'scorecard_coins',
                     'scorecard_genres',
                     'scorecard_level_stats',
                     'scorecard_music',
                     'scorecard_profit',
                     'scorecard_referrals',
                     'scorecard_vertical'
                     ];

        return templates;
    };

    $scope.getTemplate = function(templateName){

        var dir          = "html_templates/";
        var templateFile = templateName + ".html";
        var template     = "";

        $.ajax({
            url: dir + templateName + '.html',
            async: false,
            success: function (result) {
                template = result;
            }
        });

        return template;
    };

    $scope.parseHtmlTemplate = function(){

      var template  = $scope.getTemplate($scope.panel.style['html_template']);
      var subString = '$var-';

      return template === '' ? [] : $scope.parseTemplate(template, subString);
    }

    $scope.parseTemplate = function(string, subString, allowOverlapping){

        var varNames = [];
        string+=""; subString+="";
        if(subString.length<=0) return string.length+1;

        var n=0, pos=0;
        var step=(allowOverlapping)?(1):(subString.length);

        while(true){
            pos       = string.indexOf(subString,pos);

            if(pos>=0){ n++; pos+=step; } else break;

            var name       = string.substring(pos,string.indexOf("$", pos+1));
            var varIndex   = $scope.arrayObjectIndexOf(varNames, name, 'name');
            if (varIndex == -1) {
              var htmlVarIndex = $scope.arrayObjectIndexOf($scope.panel.html_vars, name, 'name');
              varNames.push({'name' : name, 'var' :  htmlVarIndex == -1 ? '' : $scope.panel.html_vars[htmlVarIndex].var });
            }
        }

        return(varNames);
    }    

    $scope.render = function() {
      if ($scope.panel.mode === 'markdown') {
        $scope.renderMarkdown($scope.panel.content);
      }
      else if ($scope.panel.mode === 'html') {
        $scope.updateContent($scope.panel.content);
      }
      else if ($scope.panel.mode === 'text') {
        $scope.renderText($scope.panel.content);
      }
      else if ($scope.panel.mode === 'html_template') {

        $scope.panel.content = $scope.getTemplate($scope.panel.style['html_template']);
        $scope.panel.content = $scope.panel.content.split('$panel.id$').join($scope.panel.id);

        for (var i = 0, len = $scope.panel.html_vars.length; i < len; i++){          
          $scope.panel.content = $scope.panel.content.split('$var-' + $scope.panel.html_vars[i].name + '$').join($scope.panel.html_vars[i].var);
        }
        $scope.updateContent($scope.panel.content);
      }
    };

    $scope.renderText = function(content) {
      content = content
        .replace(/&/g, '&amp;')
        .replace(/>/g, '&gt;')
        .replace(/</g, '&lt;')
        .replace(/\n/g, '<br/>');

      $scope.updateContent(content);
    };

    $scope.renderMarkdown = function(content) {
      var text = content
        .replace(/&/g, '&amp;')
        .replace(/>/g, '&gt;')
        .replace(/</g, '&lt;');

      if (converter) {
        $scope.updateContent(converter.makeHtml(text));
      }
      else {
        require(['./lib/showdown'], function (Showdown) {
          converter = new Showdown.converter();
          $scope.updateContent(converter.makeHtml(text));
        });
      }
    };

    $scope.updateContent = function(html) {
      try {
        $scope.content = $sce.trustAsHtml(templateSrv.replace(html));
      } catch(e) {
        console.log('Text panel error: ', e);
        $scope.content = $sce.trustAsHtml(html);
      }

      if(!$scope.$$phase) {
        $scope.$digest();
      }
    };

    $scope.openEditor = function() {
    };

    $scope.arrayObjectIndexOf = function (myArray, searchTerm, property) {

      for(var i = 0, len = myArray.length; i < len; i++) {
          if (myArray[i][property] === searchTerm) return i;
      }
      return -1;
    }    

    $scope.init();
  });
});
