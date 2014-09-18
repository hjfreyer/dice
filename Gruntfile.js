module.exports = function(grunt) {

  grunt.initConfig({
    clean: ['dist/'],
    copy: {
      srcs: {
        src: ['*.html'],
        dest: 'dist/'
      },
      bower: {
        files: [{
          expand: true,
          cwd: 'bower_components/',
          src: ['**'],
          dest: 'dist/components/'
        }]
      },
      cname: {
        files: {
          'dist/CNAME': 'CNAME'
        }
      }
    },

    coffee: {
      main: {
        files: {
          'dist/lib.js': '*.coffee'
        }
      }
    },

    buildcontrol: {
      options: {
        dir: 'dist',
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
        root: 'dist/',

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
