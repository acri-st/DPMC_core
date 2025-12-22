The Data and Processing Management Core system (DPMC) has been developed by ACRI-ST to serve the purpose of several EO projects. It concentrates ACRI-ST know-how to automate in a cost-effective solution several mandatory functions, such as data management, cataloguing, processing configuration, and processing orchestration.
The DPMC is a middleware allowing an easy deployment of services, providing its generic functionalities to the services, with new needed functions implemented as new scripts and new database tables. Thanks to its versatility and ease of use, the DPMC is particularly well suited to solve issues related to:
-	The management of very large datasets, containing several tens of millions of products.
-	Massive (re)-processing tasks.
-	Data-driven, time-driven, and on-demand processing orders via user or operator requests.
-	Automatic selection of input data based on selection rules and products metadata.
-	Parallel download and ingestion of large volumes of data.
-	Parallel processing of large amounts of files, using multiple processing chains and versions.
-	Parallel dissemination of large volumes of data.
  
The system can be deployed in a bare metal environment, a virtual environment, or a cloud environment, taking advantages of each system: performance, elasticity, robustness, security, cost. The DPMC is usually attached to a processing cluster and data storage elements that provide the computation and storage capacities to the processing system. It can also be attached to an archive component such as a tape library for backup and/or long-term preservation of the generated products.
It addresses common needs of typical EO projects and services and can be adapted to new processing chains thanks to its generic, modular and extensible architecture. These last years, the DPMC has been successfully deployed in several operational environments where it is used as a core element focusing on its processing orchestration or data management capabilities, or both.
The various implementations of the DPMC currently handle:
-	more than 100 PBytes of data
-	more than 300 million products
-	200+ processing baseline configurations
The DPMC architecture has been designed to provide:
-	Capacity growth and modularity: new computation and storage elements can be easily added and managed on the fly with no service interruption,
-	Sharing: several projects and services may be simultaneously operated on the same infrastructure,
-	Several processing baselines (auxiliary files + specific scripts + binaries) can co-exist,
-	Several product versions can co-exist (versioning),
-	Robustness to failure and capacity to automatically recover,
-	Reporting: all information related to data and processing history are stored in a database, significant events can be reported to the monitoring system for service monitoring and reporting
  
