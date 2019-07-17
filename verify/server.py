#!/usr/bin/python
# -*- coding: UTF-8 -*-

import sys, os, cherrypy
from optparse import OptionParser

parser = OptionParser()
parser.add_option("-a", "--listen", dest="listen", help="Listen port")

(options, args) = parser.parse_args()
listen = options.listen

if listen == None:
    print "Usage: %s <--listen=Listen>"%(sys.argv[0])
    print "     --listen    Server listen port"
    print "For example:"
    print "     %s --listen=8080"%(sys.argv[0])
    sys.exit(-1)

root_path = os.path.abspath(os.path.dirname(__file__)) + "/html/"

print "Listen=%s Path=%s"%(listen, root_path)

conf = {
    'global': {
        'server.socket_host': '0.0.0.0',
        'server.socket_port': int(listen)
    },
    '/': {
        'tools.staticdir.on': True,
        'tools.staticdir.dir': root_path,
        'tools.staticdir.index': 'index.html',
    }
}

class Root(object): pass
cherrypy.quickstart(Root(), '/', conf)
