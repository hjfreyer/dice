module.exports = function(grunt) {

  grunt.initConfig({
    clean: ['bin/'],
    copy: {
      srcs: {
        src: ['*.html'],
        dest: 'bin/'
      },
      bower: {
        files: [{
          expand: true,
          cwd: 'bower_components/',
          src: ['**'],
          dest: 'bin/components/'
        }]
      }
    },
    // bower: {
    //   options: {
    //     targetDir: 'bin/components',
    //     install: false,
    //     layout: 'byComponent'
    //   },
    //   main: {}
    // },
    coffee: {
      main: {
        files: {
          'bin/lib.js': '*.coffee'
        }
      }
    },

    buildcontrol: {
      options: {
        dir: 'bin',
        commit: true,
        push: true,
        message: 'Built %sourceName% from commit %sourceCommit% on branch %sourceBranch%'
      },
      deploy: {
        options: {
          remote: 'git@github.com:hjfreyer/dice.git',
          branch: 'gh-pages'
        }
      }
    },
    'http-server': {
      'dev': {
        // the server root directory
        root: 'bin/',

        port: 8000,
        host: "127.0.0.1",

        runInBackground: true
      }
    },
    watch: {
      files: ['*.html', '*.coffee'],
      tasks: ['copy:srcs', 'coffee'],
    }
  });

  grunt.loadNpmTasks('grunt-bower-task');
  grunt.loadNpmTasks('grunt-build-control');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-coffee');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-http-server');

  grunt.registerTask('dev', ['clean', 'copy',
    'coffee', 'http-server', 'watch']);

};
