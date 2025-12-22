'''
Created on 26 janv. 2016

@author: nmeskini
'''

from lxml import etree
import sys 

def get_manifest_tag(path_to_manifest,tag="startTime"):
    """
    retrieve the given tag from the manifest
    tag : can be one of the following :
                                startTime
                                stopTime
                                validityStartTime
                                validityStopTime
                                orbitNumber
    
    """
    
    tree = etree.parse(path_to_manifest)
    # get namespaceMap
    ns      = {'xfdu':'urn:ccsds:schema:xfdu:1'}
    xfdu    = etree.XPath('/xfdu:XFDU', namespaces=ns)
    xfdu_el = xfdu.evaluate(tree)[0]

    if tag == "startTime":
        startTime_path = etree.XPath('/xfdu:XFDU/metadataSection/metadataObject[@ID="acquisitionPeriod"]/metadataWrap/xmlData/sentinel-safe:acquisitionPeriod/sentinel-safe:startTime/text()', namespaces=xfdu_el.nsmap)
        startTime = startTime_path(tree)[0][:-1] # remove 'Z' at the end of string
        startTime.replace('T',' ')
        print startTime
        
    elif tag == "stopTime":
        stopTime_path = etree.XPath('/xfdu:XFDU/metadataSection/metadataObject[@ID="acquisitionPeriod"]/metadataWrap/xmlData/sentinel-safe:acquisitionPeriod/sentinel-safe:stopTime/text()', namespaces=xfdu_el.nsmap)
        stopTime = stopTime_path(tree)[0][:-1]# remove 'Z' at the end of string
        stopTime.replace('T',' ')
        print stopTime  
        
    elif tag == "validityStartTime":
        startTime_path = etree.XPath('/xfdu:XFDU/metadataSection/metadataObject[@ID="generalProductInformation"]/metadataWrap/xmlData/sentinel3aux:generalProductInformation/sentinel3aux:validityStartTime/text()', namespaces=xfdu_el.nsmap)
        startTime = startTime_path(tree)[0][:-1] # remove 'Z' at the end of string
        startTime.replace('T',' ')
        print startTime
        
    elif tag == "validityStopTime":
        stopTime_path = etree.XPath('/xfdu:XFDU/metadataSection/metadataObject[@ID="generalProductInformation"]/metadataWrap/xmlData/sentinel3aux:generalProductInformation/sentinel3aux:validityStopTime/text()', namespaces=xfdu_el.nsmap)
        stopTime = stopTime_path(tree)[0][:-1] # remove 'Z' at the end of string
        stopTime.replace('T',' ')
        print stopTime

    elif tag == "orbitNumber":
        orbitNumber_path = etree.XPath('/xfdu:XFDU/metadataSection/metadataObject[@ID="measurementOrbitReference"]/metadataWrap/xmlData/sentinel-safe:orbitReference/sentinel-safe:orbitNumber/text()', namespaces=xfdu_el.nsmap)
        orbitNumber = orbitNumber_path(tree)[0]
        print orbitNumber
        
    else :
        print "Error"
        return 1

    return 0


if __name__ == '__main__':
    status = 0
    try:
        manifest_path       = sys.argv[1]
        tag_tobe_retrieved  = sys.argv[2]
        status = get_manifest_tag(manifest_path,tag_tobe_retrieved)
    except:
        print "Error"
        exit(1)
        
    exit(status)

