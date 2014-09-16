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

  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-bower-task');
  grunt.loadNpmTasks('grunt-http-server');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-coffee');

  grunt.registerTask('dev', ['clean', 'copy',
    'coffee', 'http-server', 'watch']);

};
