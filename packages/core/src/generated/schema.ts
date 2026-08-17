/*
 * GENERATED FILE - DO NOT EDIT.
 *
 * Cloudera AI API v2, spec version 26.06.13, 118 paths.
 * Regenerate with `npm run generate -w @defysoftware/cai-core`.
 *
 * Types only: this file emits no runtime code, which is what lets
 * @defysoftware/cai-core keep zero runtime dependencies.
 */

export interface paths {
    "/api/v2/amps": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Create a new amp project. */
        post: operations["CreateAmp"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/auth/validate_key": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Validate the API v2 Key token. */
        post: operations["ValidateAPIKey"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/basecluster/sparkconfig": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Read Base Cluster spark defaults */
        get: operations["ReadBaseClusterSparkDefault"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/cml/sparkconfig/{pushdown_enabled}/{raz_enabled}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Read CML spark defaults */
        get: operations["ReadCMLSparkDefault"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/copilot/embedding_model/{copilot_embedding_model_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get a Copilot embedding model. */
        get: operations["GetCopilotEmbeddingModel"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/copilot/embedding_models": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List Copilot embedding models, optionally filtered, sorted, and
         *     paginated.
         */
        get: operations["ListCopilotEmbeddingModels"];
        put?: never;
        /** Create a Copilot embedding model. */
        post: operations["CreateCopilotEmbeddingModel"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/copilot/embedding_models/{copilot_embedding_model.id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update a Copilot embedding model. */
        patch: operations["UpdateCopilotEmbeddingModel"];
        trace?: never;
    };
    "/api/v2/copilot/embedding_models/{copilot_embedding_model_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Delete a Copilot embedding model. */
        delete: operations["DeleteCopilotEmbeddingModel"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/copilot/event": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Send a Copilot event. */
        post: operations["SendCopilotEvent"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/copilot/model/{copilot_model_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get a Copilot model. */
        get: operations["GetCopilotModel"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/copilot/models": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Copilot models, optionally filtered, sorted, and paginated. */
        get: operations["ListCopilotModels"];
        put?: never;
        /** Create a Copilot model. */
        post: operations["CreateCopilotModel"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/copilot/models/{copilot_model.id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update a Copilot model. */
        patch: operations["UpdateCopilotModel"];
        trace?: never;
    };
    "/api/v2/copilot/models/{copilot_model_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Delete a Copilot model. */
        delete: operations["DeleteCopilotModel"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/cpuprofiles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List CPU resource profiles */
        get: operations["ListCPUProfiles"];
        put?: never;
        /** Create a CPU resource profile */
        post: operations["CreateCPUProfile"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/cpuprofiles/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Delete a CPU resource profile */
        delete: operations["DeleteCPUProfile"];
        options?: never;
        head?: never;
        /** Update a CPU resource profile */
        patch: operations["UpdateCPUProfile"];
        trace?: never;
    };
    "/api/v2/dashboardsarchive/{days_finished}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Archive Dashboards. May affect other endpoints. See https://docs.cloudera.com/r/cai-dashboard-archive-api */
        post: operations["DashboardsArchive"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/default-quota/all": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get default quota for users */
        get: operations["GetDefaultQuotas"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/default-quota/team": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Set default quota for teams */
        post: operations["SetTeamDefaultQuota"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/default-quota/user": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get default quota for users */
        get: operations["GetDefaultQuota"];
        put?: never;
        /** Set default quota for users */
        post: operations["SetDefaultQuota"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/diagnostics/bundle": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Generate a diagnostics bundle */
        post: operations["GenerateDiagBundle"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/diagnostics/bundle/status/{request_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get the status of a diagnostics bundle */
        get: operations["GetDiagBundleStatus"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/dockercredentials": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Docker credentials. */
        get: operations["ListDockerCredentials"];
        put?: never;
        /** Create a Docker credential. */
        post: operations["CreateDockerCredential"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/dockercredentials/{docker_credential.id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update a Docker credential */
        patch: operations["UpdateDockerCredential"];
        trace?: never;
    };
    "/api/v2/dockercredentials/{docker_credential_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Delete a Docker credential. */
        delete: operations["DeleteDockerCredential"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/experiments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Lists all experiments that belong to a user across all projects. */
        get: operations["ListAllExperiments"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/groupsquota": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Return all the groups and its quotas based on the context. Admin gets all the groups details. */
        get: operations["ListGroupsQuota"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/jobs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Returns all jobs a user has access to. */
        get: operations["ListAllJobs"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/ml_serving_apps": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List all ML Serving Apps. */
        get: operations["ListMlServingApps"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/models": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List all models that belong to a user across all projects. */
        get: operations["ListAllModels"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/newsfeeds/{category}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List the newsfeeds, optionally filtered, sorted, and paginated. */
        get: operations["ListNewsFeeds"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/nodelabels": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List all Accelerator Node Label or GPU Profiles */
        get: operations["ListAllAcceleratorNodeLabels"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/nodelabels/config": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update admin_config_max_per_workload in Node Labels */
        patch: operations["UpdateAcceleratorLabelsAdminConfig"];
        trace?: never;
    };
    "/api/v2/nodelabels/default_quota": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update default_quota in Node Labels */
        patch: operations["UpdateAcceleratorLabelsDefaultQuota"];
        trace?: never;
    };
    "/api/v2/nodelabels/quota": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List all Accelerator based quota for user */
        get: operations["ListAcceleratorBasedUserQuota"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update Accelerator based quota for user */
        patch: operations["UpdateAcceleratorBasedUserQuota"];
        trace?: never;
    };
    "/api/v2/nodelabels/team-quota": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List all Accelerator based quota for team */
        get: operations["ListAcceleratorBasedTeamQuota"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update Accelerator based quota for team */
        patch: operations["UpdateAcceleratorBasedTeamQuota"];
        trace?: never;
    };
    "/api/v2/nodelabels/{resource_group_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Create a GPU profile */
        post: operations["CreateAcceleratorNodeLabelGpuProfile"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/nodelabels/{resource_group_id}/gpuprofile": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Delete an exsiting GPU profile */
        delete: operations["DeleteAcceleratorNodeLabelGpuProfile"];
        options?: never;
        head?: never;
        /** Update a GPU profile */
        patch: operations["UpdateAcceleratorNodeLabelGpuProfile"];
        trace?: never;
    };
    "/api/v2/projectnames": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Return all the project names the user has access to, optionally filtered, sorted, and paginated. */
        get: operations["ListProjectNames"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/projects": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Return all projects, optionally filtered, sorted, and paginated. */
        get: operations["ListProjects"];
        put?: never;
        /** Create a new project. */
        post: operations["CreateProject"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/projects/batch": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Return a list of projects given a list of project IDs. This method will only return
         *     projects that the calling user has access to, and can be used in situations where
         *     information about a subset of projects (like project names) is needed.
         */
        get: operations["BatchListProjects"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/projects/{experiment.project_id}/experiments/{experiment.id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update an existing experiment. */
        patch: operations["UpdateExperiment"];
        trace?: never;
    };
    "/api/v2/projects/{project.id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update an existing project. */
        patch: operations["UpdateProject"];
        trace?: never;
    };
    "/api/v2/projects/{project_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Return one project. */
        get: operations["GetProject"];
        put?: never;
        post?: never;
        /** Delete a project. */
        delete: operations["DeleteProject"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/projects/{project_id}/applications": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List applications, optionally filtered, sorted, and paginated. */
        get: operations["ListApplications"];
        put?: never;
        /** Create an application and implicitly start it immediately. */
        post: operations["CreateApplication"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/projects/{project_id}/applications/{application.id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update an application */
        patch: operations["UpdateApplication"];
        trace?: never;
    };
    "/api/v2/projects/{project_id}/applications/{application_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get an application. */
        get: operations["GetApplication"];
        put?: never;
        post?: never;
        /** Delete an application. */
        delete: operations["DeleteApplication"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/projects/{project_id}/applications/{application_id}:restart": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Start an application. */
        post: operations["RestartApplication"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/projects/{project_id}/applications/{application_id}:stop": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Stop an application. */
        post: operations["StopApplication"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/projects/{project_id}/collaborators": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List project collaborators. */
        get: operations["ListProjectCollaborators"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/projects/{project_id}/collaborators/{username}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Add a project collaborator */
        put: operations["AddProjectCollaborator"];
        post?: never;
        /** Delete a project collaborator */
        delete: operations["DeleteProjectCollaborator"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/projects/{project_id}/experiments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List all experiments in a given project. */
        get: operations["ListExperiments"];
        put?: never;
        /** Create an experiment. */
        post: operations["CreateExperiment"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/projects/{project_id}/experiments/{experiment_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Return one experiment. */
        get: operations["GetExperiment"];
        put?: never;
        post?: never;
        /** Delete an experiment that belongs to an experiment id. */
        delete: operations["DeleteExperiment"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/projects/{project_id}/experiments/{experiment_id}/runs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Returns a list of Runs that belong to an experiment. */
        get: operations["ListExperimentRuns"];
        put?: never;
        /** Create a run for an experiment. */
        post: operations["CreateExperimentRun"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/projects/{project_id}/experiments/{experiment_id}/runs/{run.id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update an experiment run. */
        patch: operations["UpdateExperimentRun"];
        trace?: never;
    };
    "/api/v2/projects/{project_id}/experiments/{experiment_id}/runs/{run_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get metadata, metrics, params, tags and artifacts for a run. In the case where multiple metrics
         *     with the same key are logged for a run, return only the value with the latest timestamp.
         *     If there are multiple values with the latest timestamp, return the maximum of these values.
         */
        get: operations["GetExperimentRun"];
        put?: never;
        post?: never;
        /** Delete an experiment run. */
        delete: operations["DeleteExperimentRun"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/projects/{project_id}/experiments/{experiment_id}/runs/{run_id}/metrics/{metric_key}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Gets the all the recorded metrics for the key for a given run. */
        get: operations["GetExperimentRunMetrics"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/projects/{project_id}/experiments/{experiment_id}/runs/{run_id}:deletebatch": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Bulk delete an experiment run details like metrics, params, tags in one request. */
        post: operations["DeleteExperimentRunBatch"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/projects/{project_id}/experiments/{experiment_id}/runs/{run_id}:logbatch": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Bulk update an experiment run details like metrics, params, tags in one request. */
        post: operations["LogExperimentRunBatch"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/projects/{project_id}/files/{path}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List files/subdirectories at a specified path */
        get: operations["ListProjectFiles"];
        put?: never;
        post?: never;
        /** Delete a file or directory. */
        delete: operations["DeleteProjectFile"];
        options?: never;
        head?: never;
        /** Update file metadata, such as renaming. */
        patch: operations["UpdateProjectFileMetadata"];
        trace?: never;
    };
    "/api/v2/projects/{project_id}/jobs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Returns all jobs, optionally filtered, sorted, and paginated. */
        get: operations["ListJobs"];
        put?: never;
        /** Create a new job. */
        post: operations["CreateJob"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/projects/{project_id}/jobs/{job.id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Updates a job. */
        patch: operations["UpdateJob"];
        trace?: never;
    };
    "/api/v2/projects/{project_id}/jobs/{job_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Return one job. */
        get: operations["GetJob"];
        put?: never;
        post?: never;
        /** Deletes a job. */
        delete: operations["DeleteJob"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/projects/{project_id}/jobs/{job_id}/runs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Lists job runs, optionally filtered, sorted, and paginated. */
        get: operations["ListJobRuns"];
        put?: never;
        /** Create and start a new job run for a job. */
        post: operations["CreateJobRun"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/projects/{project_id}/jobs/{job_id}/runs/{run_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Gets a job run. */
        get: operations["GetJobRun"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/projects/{project_id}/jobs/{job_id}/runs/{run_id}:stop": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Stops a job run. Encoded as a custom method. */
        post: operations["StopJobRun"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/projects/{project_id}/machineusers": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ListAllRunAsMachineUserCollaborators"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/projects/{project_id}/models": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List models, optionally filtered, sorted, and paginated. */
        get: operations["ListModels"];
        put?: never;
        /** Create a model. */
        post: operations["CreateModel"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/projects/{project_id}/models/{model.id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update a model. */
        patch: operations["UpdateModel"];
        trace?: never;
    };
    "/api/v2/projects/{project_id}/models/{model_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get a model. */
        get: operations["GetModel"];
        put?: never;
        post?: never;
        /** Delete a model. */
        delete: operations["DeleteModel"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/projects/{project_id}/models/{model_id}/builds": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List model builds, optionally filtered, sorted, and paginated. */
        get: operations["ListModelBuilds"];
        put?: never;
        /** Create a model build. */
        post: operations["CreateModelBuild"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/projects/{project_id}/models/{model_id}/builds/{build_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get a model build. */
        get: operations["GetModelBuild"];
        put?: never;
        post?: never;
        /** Delete a model build. */
        delete: operations["DeleteModelBuild"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/projects/{project_id}/models/{model_id}/builds/{build_id}/deployments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List model deployments, optionally filtered, sorted, and paginated. */
        get: operations["ListModelDeployments"];
        put?: never;
        /** Create a model deployment. */
        post: operations["CreateModelDeployment"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/projects/{project_id}/models/{model_id}/builds/{build_id}/deployments/{deployment_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get a model deployment. */
        get: operations["GetModelDeployment"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/projects/{project_id}/models/{model_id}/builds/{build_id}/deployments/{deployment_id}:restart": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Restart a model deployment. */
        post: operations["RestartModelDeployment"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/projects/{project_id}/models/{model_id}/builds/{build_id}/deployments/{deployment_id}:stop": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Stop a model deployment. */
        post: operations["StopModelDeployment"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/registry/models": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List registered models. */
        get: operations["ListRegisteredModels"];
        put?: never;
        /** Register a model. */
        post: operations["CreateRegisteredModel"];
        delete?: never;
        options?: never;
        head?: never;
        /** Update a Registered model. */
        patch: operations["UpdateRegisteredModel"];
        trace?: never;
    };
    "/api/v2/registry/models/{model_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get a registered model. */
        get: operations["GetRegisteredModel"];
        put?: never;
        post?: never;
        /** Unregister a model deletes a model. */
        delete: operations["DeleteRegisteredModel"];
        options?: never;
        head?: never;
        /** Update a Registered model version. */
        patch: operations["UpdateRegisteredModelVersion"];
        trace?: never;
    };
    "/api/v2/registry/models/{model_id}/versions/{version_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get a registered model version */
        get: operations["GetRegisteredModelVersion"];
        put?: never;
        post?: never;
        /** Unregister a model version. */
        delete: operations["DeleteRegisteredModelVersion"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/resourcegroup": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update Resource Group. */
        patch: operations["UpdateResourceGroup"];
        trace?: never;
    };
    "/api/v2/resourcegroups": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List all Resource Groups. */
        get: operations["ListAllResourceGroups"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/runtimeaddons": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List the available runtime addons, optionally filtered, sorted, and paginated. */
        get: operations["ListRuntimeAddons"];
        put?: never;
        /** Load runtime addons asynchronously from an uploaded JSON assembly */
        post: operations["LoadRuntimeAddonsUpload"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/runtimeaddons:updatestatus": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Update runtime addons */
        post: operations["UpdateRuntimeAddonStatus"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/runtimerepos": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Runtime repos. */
        get: operations["ListRuntimeRepos"];
        put?: never;
        /** Create a  Runtime repo. */
        post: operations["CreateRuntimeRepo"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/runtimerepos/{runtime_repo_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Delete a Runtime repo. */
        delete: operations["DeleteRuntimeRepo"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/runtimerepos/{runtimerepo.id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update a Runtime repo. */
        patch: operations["UpdateRuntimeRepo"];
        trace?: never;
    };
    "/api/v2/runtimes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List the available runtimes, optionally filtered, sorted, and paginated. */
        get: operations["ListRuntimes"];
        put?: never;
        /** Register a runtime, given the URL to the image in the docker registry */
        post: operations["RegisterCustomRuntime"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/runtimes/credential:set": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Set a Docker credential for a Runtime. */
        post: operations["SetDockerCredential"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/runtimes:update": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Update the status of selected runtimes */
        post: operations["UpdateRuntimeStatus"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/runtimes:validate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Validate a runtime, given the URL to the image in the docker registry */
        get: operations["ValidateCustomRuntime"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/site/config:update": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Disable engines */
        post: operations["DisableEngines"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/site/synced-teams": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Create a synced team */
        post: operations["CreateSyncedTeam"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/site/teams": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Create a team. */
        post: operations["CreateTeam"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/sync/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get latest sync status */
        get: operations["LatestSyncStatus"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/sync/teams/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get last teams sync status */
        get: operations["TeamsSyncStatus"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/sync/users/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get last users sync status */
        get: operations["UsersSyncStatus"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/teams/{team_name}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Delete a team. */
        delete: operations["DeleteTeam"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/teams/{team_name}/group_members": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List synced team members with cdp group info */
        get: operations["ListSyncedTeamMembers"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/teams/{team_name}/group_members/{user_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update member permission for a synced team */
        patch: operations["UpdateMemberPermissionForSyncedTeam"];
        trace?: never;
    };
    "/api/v2/teams/{team_name}/groups": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List cdp groups with their default permission for a synced team */
        get: operations["ListSyncedTeamGroups"];
        /** Add a cdp group to a synced team */
        put: operations["AddGroupToSyncedTeam"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/teams/{team_name}/groups/{group_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Remove a cdp group from a synced team */
        delete: operations["RemoveGroupFromSyncedTeam"];
        options?: never;
        head?: never;
        /** Update Group permission for a synced team */
        patch: operations["UpdateGroupPermissionForSyncedTeam"];
        trace?: never;
    };
    "/api/v2/ts_data": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Return the time series data for the requested resource or property. */
        get: operations["GetTimeSeries"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/usage": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Return the new usage view based on the caller context, optionally filtered, sorted, and paginated. */
        get: operations["ListUsage"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/users/{user_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["GetShortUserByID"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/users/{username}/v1_key:rotate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Rotate API V1 key */
        post: operations["RotateV1Key"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/users/{username}/v2_keys": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get all API V2 keys */
        get: operations["ListV2Keys"];
        put?: never;
        /** Create API V2 key */
        post: operations["CreateV2Key"];
        /** Delete all API V2 keys */
        delete: operations["DeleteV2Keys"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/users/{username}/v2_keys/{key_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Delete an API V2 key */
        delete: operations["DeleteV2Key"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/userslabels/quota": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Return all the quota usage for the user and accelerator based on the context. Admin gets all the users details. */
        get: operations["ListUsersAcceleratorQuota"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/userslabels/team-quota": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Return all the quota usage for the team and accelerator based on the context. Admin gets all the teams details. */
        get: operations["ListTeamsAcceleratorQuota"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/usersquota": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Return all the user names and quotas based on the context. Admin gets all the users details. */
        get: operations["ListUsersQuota"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/workloads/executions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List all workloads and executions */
        get: operations["ListWorkloadExecutions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/workloadstatus": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Return the workload statuses. */
        get: operations["ListWorkloadStatus"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/workloadtypes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Return the workload types. */
        get: operations["ListWorkloadTypes"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/workspaces/sparkconfig": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Set workspace spark defaults */
        post: operations["SetWorkspaceSparkDefault"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/workspaces/sparkconfig/{is_pushdown}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Read workspace spark defaults */
        get: operations["ReadWorkspaceSparkDefault"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/projects/{project_id}/files": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** upload a file as a multi-part upload */
        post: operations["UploadFile"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/projects/{project_id}/files/{path}:download": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** download a project file */
        post: operations["DownloadProjectFile"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/diagnostics/download/{request_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** download a diagnostics bundle */
        get: operations["DownloadDiagnosticsBundle"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v2/runtimeaddons/custom": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Create a new Custom Runtime Addon from an uploaded tarball */
        post: operations["HandleCustomRuntimeUpload"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        AcceleratorBasedTeamQuota: {
            /** Format: int64 */
            team_id?: string;
            /** Format: int64 */
            accelerator_id?: string;
            gpu_quota?: string;
            accelerator_key?: string;
            accelerator_value?: string;
        };
        AcceleratorBasedUserQuota: {
            /** Format: int64 */
            user_id?: string;
            /** Format: int64 */
            accelerator_id?: string;
            gpu_quota?: string;
            accelerator_key?: string;
            accelerator_value?: string;
        };
        AcceleratorNodeLabel: {
            /** Format: int64 */
            id?: string;
            label_key?: string;
            label_value?: string;
            /** Format: boolean */
            availability?: boolean;
            /** Format: int64 */
            max_gpu_count?: string;
            /** Format: int64 */
            current_gpu_count?: string;
            /** Format: int64 */
            max_gpu_per_workload?: string;
            /** Format: date-time */
            created_at?: string;
            /** Format: date-time */
            updated_at?: string;
            /** Format: int64 */
            default_quota?: string;
            /** Format: int64 */
            resource_group_id?: string;
            /** Format: double */
            cpu?: number;
            /** Format: double */
            memory?: number;
            /** Format: double */
            gpu_memory?: number;
        };
        /** Parameters to add a cdp group to a synced team */
        AddGroupToSyncedTeamRequest: {
            /** team name */
            team_name?: string;
            group_permission?: components["schemas"]["GroupPermission"];
        };
        /** Response to add a cdp group to a synced team */
        AddGroupToSyncedTeamResponse: Record<string, never>;
        /** @description Request for adding a project collaborator. */
        AddProjectCollaboratorRequest: {
            /** @description The identifier of the project. */
            project_id?: string;
            /** @description The username of the collaborator to add. */
            username?: string;
            /** @description The project permission of the collaborator to set. */
            permission?: string;
        };
        /** @description Response for adding a project collaborator. */
        AddProjectCollaboratorResponse: Record<string, never>;
        /** @description A single application. */
        Application: {
            /** @description public identifier of the application. */
            id?: string;
            /** Application name */
            name?: string;
            /** Application description */
            description?: string;
            creator?: components["schemas"]["ShortUser"];
            /** The script to run for this application */
            script?: string;
            /** The subdomain of the application */
            subdomain?: string;
            status?: components["schemas"]["ApplicationStatus"];
            /**
             * Format: date-time
             * @description When the application was created.
             */
            created_at?: string;
            /**
             * When the application was stopped
             * Format: date-time
             */
            stopped_at?: string;
            /**
             * When the application was updated
             * Format: date-time
             */
            updated_at?: string;
            /**
             * When the application was started
             * Format: date-time
             */
            starting_at?: string;
            /**
             * When the application started running
             * Format: date-time
             */
            running_at?: string;
            /** @description The kernel of the application. */
            kernel?: string;
            /**
             * Format: double
             * @description The number of vCPU allocated for the job run application.
             */
            cpu?: number;
            /**
             * Format: double
             * @description The amount of memory allocated for the application (in GB).
             */
            memory?: number;
            /**
             * Format: int32
             * @description The number of Nvidia GPUs allocated for the application.
             */
            nvidia_gpu?: number;
            /**
             * Enable unauthenticated access to application
             * Format: boolean
             */
            bypass_authentication?: boolean;
            /** String of environment variables in json format */
            environment?: string;
            /** @description Runtime image this application should run on. */
            runtime_identifier?: string;
            /** @description The list of runtime addons that this application uses. */
            runtime_addon_identifiers?: string[];
            /**
             * userID of the service account that will be used to run the job.
             *     If 0 is returned, it means that job will run as the logged in user
             * Format: int32
             */
            run_as?: number;
            /**
             * Whether it is a CDV app or a non-CDV app
             * Format: boolean
             */
            cdv_app?: boolean;
            /**
             * Label to use for node selecting gpu/accelerator
             * Format: int64
             */
            accelerator_label_id?: string;
            /**
             * Format: int32
             * @description The ID of the resource group associated with this application.
             */
            resource_group_id?: number;
            /**
             * Format: int32
             * @description The ID of the resource profile that determines the CPU and memory allocation for this application.
             */
            resource_profile_id?: number;
        };
        /**
         * Possible status of an application
         * @default APPLICATION_UNKNOWN
         * @enum {string}
         */
        ApplicationStatus: "APPLICATION_UNKNOWN" | "APPLICATION_STARTING" | "APPLICATION_RUNNING" | "APPLICATION_STOPPING" | "APPLICATION_STOPPED" | "APPLICATION_FAILED";
        BaseClusterSparkDefault: {
            name?: string;
            value?: string;
        };
        /** @description Respons object for listing projects given a list of IDs. */
        BatchListProjectsResponse: {
            /** @description The list of projects. */
            projects?: components["schemas"]["Project"][];
        };
        /** Abbreviated project collaborator information */
        Collaborator: {
            user?: components["schemas"]["ShortUser"];
            /** @description Permission to the project. */
            permission?: string;
        };
        /** @description Parameters to configure prootype(Accelerators for ML Projects). */
        ConfigurePrototypeRequest: {
            /**
             * Whether we are trying to create project for an amp
             * Format: boolean
             */
            is_huggingface_space?: boolean;
            /**
             * Whether we are trying to create project for an amp
             * Format: boolean
             */
            is_community?: boolean;
            /**
             * Whether amp steps should be carried out. Relevant only when is_prototype = true
             * Format: boolean
             */
            execute_amp_steps?: boolean;
            /** The runtime image identifier to be used during amp configuration */
            runtime_identifier?: string;
            /** @description Optional runtime addons associated with this amp and used during amp configuration. */
            runtime_addon_identifiers?: string[];
            /**
             * Whether import tasks for the amp should be executed
             * Format: boolean
             */
            run_import_tasks?: boolean;
        };
        /** Copilot Embedding Model */
        CopilotEmbeddingModel: {
            /** @description ID of the model. Must be unique. */
            id?: string;
            /** @description The Model Provider. E.g. 'Amazon Bedrock' or 'CML Serving'. */
            provider?: string;
            /**
             * @description The name of the model. E.g. 'Llama2 70b'. The combination of the
             *     provider and name fields must be unique.
             */
            name?: string;
            /** @description For CMLServing models, the model endpoint string to connect to. */
            endpoint?: string;
            /**
             * Format: boolean
             * @description Whether a model is enabled for Copilot use.
             */
            enabled?: boolean;
            /**
             * Format: boolean
             * @description Whether this model is the default model for Copilot use. Only one model
             *     can be the default Copilot model. Only enabled models can be the default.
             */
            default?: boolean;
            /**
             * @description The provider_id string for this model. AI Inference models should
             *     have "cloudera". For Amazon Bedrock models, Anthropic/Claude models
             *     should have "bedrock-chat", while others should have "bedrock".
             */
            provider_id?: string;
        };
        /** Copilot Language Model */
        CopilotModel: {
            /** @description ID of the model. Must be unique. */
            id?: string;
            /** @description The Model Provider. E.g. 'Amazon Bedrock' or 'CML Serving'. */
            provider?: string;
            /**
             * @description The name of the model. E.g. 'Llama2 70b'. The combination of the
             *     provider and name fields must be unique.
             */
            name?: string;
            /** @description For CMLServing models, the model endpoint string to connect to. */
            endpoint?: string;
            /**
             * Format: boolean
             * @description Whether a model is enabled for Copilot use.
             */
            enabled?: boolean;
            /**
             * Format: boolean
             * @description Whether this model is the default model for Copilot use. Only one model
             *     can be the default Copilot model. Only enabled models can be the default.
             */
            default?: boolean;
            /**
             * @description The provider_id string for this model. AI Inference models should
             *     have "cloudera". For Amazon Bedrock models, Anthropic/Claude models
             *     should have "bedrock-chat", while others should have "bedrock".
             */
            provider_id?: string;
        };
        /** CPU resource profile */
        CpuProfile: {
            /** Format: int32 */
            id?: number;
            /** Format: double */
            cpu?: number;
            /** Format: double */
            memory?: number;
            /** Format: int32 */
            resource_group_id?: number;
        };
        /** @description Parameters to create a new AMP (Accelerators for ML Projects). */
        CreateAmpRequest: {
            create_project_request?: components["schemas"]["CreateProjectRequest"];
            configure_prototype_request?: components["schemas"]["ConfigurePrototypeRequest"];
        };
        /** @description Parameters to create an applications. */
        CreateApplicationRequest: {
            /** The project's identifier */
            project_id?: string;
            /** @description Name of the new application. */
            name?: string;
            /**
             * The subdomain of the application.
             *     The application will be served at the URL http(s)://subdomain.<domain>
             */
            subdomain?: string;
            /** @description The description of the application. */
            description?: string;
            /** @description The script to run for the new application. */
            script?: string;
            /**
             * Format: double
             * @description CPU cores to allocate to application (default 1).
             */
            cpu?: number;
            /**
             * Format: double
             * @description Memory in GB to allocate to application (default 1).
             */
            memory?: number;
            /**
             * Format: int32
             * @description Number of Nvidia GPUs to allocate to this application (default 0).
             */
            nvidia_gpu?: number;
            /** @description Default environment variables to include in application. */
            environment?: {
                [key: string]: string;
            };
            /**
             * @description Kernel to run the job runs on. Possible values are
             *     python3, python2, r, or scala. Leave blank for runtimes.
             */
            kernel?: string;
            /**
             * Enable unauthenticated access to application
             * Format: boolean
             */
            bypass_authentication?: boolean;
            /** @description Runtime image identifier to run the application with. */
            runtime_identifier?: string;
            /** @description Runtime addons to run the application with if using runtimes. */
            runtime_addon_identifiers?: string[];
            /**
             * Format: int32
             * @description UserID of service account used to run the application.
             */
            run_as?: number;
            /**
             * Whether it is a CDV app or a non-CDV app
             * Format: boolean
             */
            cdv_app?: boolean;
            /**
             * Label to use for node selecting gpu/accelerator
             * Format: int64
             */
            accelerator_label_id?: string;
            /**
             * Format: int32
             * @description The ID of the resource group associated with this application.
             */
            resource_group_id?: number;
            /**
             * Format: int32
             * @description The ID of the resource profile that determines the CPU and memory allocation for this application.
             */
            resource_profile_id?: number;
        };
        /** @description Parameters for creating a Copilot embedding model. */
        CreateCopilotEmbeddingModelRequest: {
            /** Name of the model provider. E.g. 'Amazon Bedrock' */
            provider?: string;
            /** @description Name of the embedding model. E.g. 'Llama2 70b'. */
            name?: string;
            /** @description For CMLServing models, the model endpoint. */
            endpoint?: string;
            /**
             * Format: boolean
             * @description Whether or not to enable this embedding model for use in Copilot.
             */
            enabled?: boolean;
            /**
             * Format: boolean
             * @description Whether to make this the default Copilot embedding model. If set to
             *     true, the existing default Copilot model will no longer be default,
             *     and this one will become the default.
             */
            default?: boolean;
            /**
             * @description The provider_id string for this model. AI Inference models should
             *     have "cloudera". For Amazon Bedrock models, Anthropic/Claude models
             *     should have "bedrock-chat", while others should have "bedrock".
             */
            provider_id?: string;
        };
        /** @description Parameters for creating a Copilot model. */
        CreateCopilotModelRequest: {
            /** Name of the model provider. E.g. 'Amazon Bedrock' */
            provider?: string;
            /** @description Name of the model. E.g. 'Llama2 70b'. */
            name?: string;
            /** @description For CMLServing models, the model endpoint. */
            endpoint?: string;
            /**
             * Format: boolean
             * @description Whether or not to enable this model for use in Copilot.
             */
            enabled?: boolean;
            /**
             * Format: boolean
             * @description Whether to make this the default Copilot model. If set to true,
             *     the existing default Copilot model will no longer be default, and
             *     this one will become the default.
             */
            default?: boolean;
            /**
             * @description The provider_id string for this model. AI Inference models should
             *     have "cloudera".  For Amazon Bedrock models, Anthropic/Claude models
             *     should have "bedrock-chat", while others should have "bedrock".
             */
            provider_id?: string;
        };
        /** Request to create CPU profile */
        CreateCpuProfileRequest: {
            /** Format: int32 */
            resource_group_id?: number;
            /** Format: double */
            cpu?: number;
            /** Format: double */
            memory?: number;
        };
        /** Response to create CPU profile */
        CreateCpuProfileResponse: {
            cpu_profile?: components["schemas"]["CpuProfile"];
        };
        /**
         * @description For the use-casaes of creating a docker credential,
         *     we need to have an object that contains the sensitive fields
         *     but not the ID.
         */
        CreateDockerCredentialRequest: {
            name?: string;
            server?: string;
            username?: string;
            password?: string;
            /** Format: boolean */
            is_default?: boolean;
        };
        /** @description CreateExperimentRequest takes the project id and Experiment name. */
        CreateExperimentRequest: {
            project_id?: string;
            /** Experiment name */
            name?: string;
            /** Tags to add more metadata to experiment */
            tags?: components["schemas"]["Tag"][];
            /**
             * @description Location where all artifacts for the experiment are stored.
             *     URI of the directory where artifacts should be uploaded.
             *     This can be a local path (starting with "/"), or a distributed file system (DFS)
             *     path, like ``s3://bucket/directory`` or ``dbfs:/my/directory``.
             *     If not set, the local ``./mlruns`` directory is  chosen.
             */
            artifact_location?: string;
            /** Engine ID (from session) */
            engine_id?: string;
        };
        /**
         * @description CreateExperimentRunRequest takes an experiment id and project id and
         *     creates an ExperimentRun entry.
         */
        CreateExperimentRunRequest: {
            project_id?: string;
            /** @description ID of the associated experiment. */
            experiment_id?: string;
            /** @description Run name of a run. */
            run_name?: string;
            /**
             * Format: date-time
             * @description Run Start time.
             */
            start_time?: string;
            /** @description Additional metadata for ExperimentRun. */
            tags?: components["schemas"]["Tag"][];
        };
        /** @description Parameters to create a new job. */
        CreateJobRequest: {
            /** @description ID of the project containing the job. */
            project_id?: string;
            /** @description Name of the new job. */
            name?: string;
            /** @description The script to run for the new job. */
            script?: string;
            /**
             * Format: double
             * @description CPU cores to allocate to job runs for this job (default 1).
             */
            cpu?: number;
            /**
             * Format: double
             * @description Memory in GB to allocate to job runs for this job (default 1).
             */
            memory?: number;
            /**
             * Format: int32
             * @description Number of Nvidia GPUs to allocate to this job (default 0).
             */
            nvidia_gpu?: number;
            /**
             * Optional dependent job if this new job is a dependency.
             *     Setting this to a parent job will make this job run when the parent job
             *     completes. Cannot be used alongside "schedule".
             *     this is deprecated and alias of parent_id
             */
            parent_job_id?: string;
            /** @description Default environment variables to include in job runs for this job. */
            environment?: {
                [key: string]: string;
            };
            /** Default arguments to pass to job runs for this job */
            arguments?: string;
            /**
             * Format: int32
             * @description Timeout in seconds of job runs for this job.
             */
            timeout?: number;
            /**
             * @description Schedule to run a job automatically. Cannot be used in a dependency job.
             *     Follows the cron format. For example, to execute the job every Monday
             *     at 1 PM UTC, the schedule would be "0 13 * * 1" without quotes.
             */
            schedule?: string;
            /**
             * @description Kernel to run the job runs on. Possible values are
             *     python3, python2, r, or scala.
             *     Should not be set if the project uses ML Runtimes.
             */
            kernel?: string;
            /**
             * @description An optional list of recipients to receive notifications for job events
             *     such as successful runs, failures, and manual stops.
             */
            recipients?: components["schemas"]["JobRecipient"][];
            /**
             * @description Files to attach (with path relative to /home/cdsw/) in notification emails.
             *     For example, to attach a file located at /home/cdsw/report/result.csv,
             *     include "report/result.csv" in the array for this field.
             */
            attachments?: string[];
            /**
             * @description The runtime image identifier to use if this job is part of a ML Runtime project.
             *     Must be set if using ML Runtimes.
             */
            runtime_identifier?: string;
            /** @description A list of runtime addon identifiers associated with this job. */
            runtime_addon_identifiers?: string[];
            /**
             * Format: boolean
             * @description Whether to kill the job on timeout. This field does nothing if the timeout
             *     is not set.
             */
            kill_on_timeout?: boolean;
            /**
             * @description Timezone of the job. Relevant only when schedule
             *     (recurring jobs) is provided (default 'America/Los_Angeles').
             */
            timezone?: string;
            /**
             * Format: boolean
             * @description Whether to create the job in paused state. Relevant only when schedule
             *     (recurring jobs) is provided. Recurring jobs are put in un-paused state by default.
             */
            paused?: boolean;
            /**
             * @description Optional dependent job if this new job is a dependency.
             *     Setting this to a parent job will make this job run when the parent job
             *     completes. Cannot be used alongside "schedule".
             */
            parent_id?: string;
            /** recipients that are notified when job succeeds */
            success_recipients?: string;
            /** recipients that are notified on when job fails */
            failure_recipients?: string;
            /** recipients that are notified when job times out */
            timeout_recipients?: string;
            /** recipients that are notified when job stops */
            stopped_recipients?: string;
            /**
             * userID of the service account user
             *     defaults to userID of the creator
             * Format: int32
             */
            run_as?: number;
            /**
             * Label to use for node selecting gpu/accelerator
             * Format: int64
             */
            accelerator_label_id?: string;
            /**
             * Format: boolean
             * @description Whether retry is enabled for the job (default false).
             */
            retry_enabled?: boolean;
            /**
             * Format: int32
             * @description Maximum number of retries (default 0).
             */
            max_retry?: number;
            /**
             * Format: int32
             * @description Delay in seconds before retrying (default 0).
             */
            retry_delay?: number;
            /**
             * Whether retry is enabled for script failures
             * Format: boolean
             */
            retry_for_script_failure?: boolean;
            /**
             * Whether retry is enabled for system failures
             * Format: boolean
             */
            retry_for_system_failure?: boolean;
            /**
             * Whether retry is enabled for timedout runs
             * Format: boolean
             */
            retry_for_timedout_runs?: boolean;
            /**
             * Whether retry is enabled for skipped runs
             * Format: boolean
             */
            retry_for_skipped_runs?: boolean;
            /**
             * Format: int32
             * @description The ID of the resource group associated with this job.
             */
            resource_group_id?: number;
            /**
             * Format: int32
             * @description The ID of the resource profile that determines the CPU and memory allocation for this job.
             */
            resource_profile_id?: number;
        };
        /** @description Parameters to create a new job run. */
        CreateJobRunRequest: {
            /** @description ID of the project containing the job. */
            project_id?: string;
            /** @description The job ID to create a new job run for. */
            job_id?: string;
            /** @description The environment variables to include in this run. */
            environment?: {
                [key: string]: string;
            };
            /** The arguments to pass to this job run */
            arguments?: string;
        };
        CreateModelBuildRequest: {
            /** @description ID of the project containing the model build. */
            project_id?: string;
            /** @description The ID of the model that will the build. */
            model_id?: string;
            /** @description A comment associated with the build. */
            comment?: string;
            /** @description The path to the file to build. */
            file_path?: string;
            /** @description The function name to run when executing the build. */
            function_name?: string;
            /** @description The kernel the model build should use. */
            kernel?: string;
            /** @description The runtime ID the model build should use. */
            runtime_identifier?: string;
            /** @description The runtime addons the model build should use, if using runtimes. */
            runtime_addon_identifiers?: string[];
            /** @description ID of the registered model version. */
            registered_model_version_id?: string;
            auto_deployment_config?: components["schemas"]["ShortCreateModelDeployment"];
            /**
             * deploy the model after successful build
             * Format: boolean
             */
            auto_deploy_model?: boolean;
            /** Root folder to be used for file_path */
            model_root_dir?: string;
            /** Custom build script path */
            build_script_path?: string;
            /**
             * Label to use for node selecting gpu/accelerator
             * Format: int64
             */
            accelerator_label_id?: string;
            /**
             * Format: int32
             * @description The ID of the resource group associated with this job.
             */
            resource_group_id?: number;
            /**
             * Format: int32
             * @description The ID of the resource profile that determines the CPU and memory allocation for this job.
             */
            resource_profile_id?: number;
        };
        /** @description Request for creating a model deployment. */
        CreateModelDeploymentRequest: {
            /** @description ID of the project containing the model. */
            project_id?: string;
            /** @description ID of the model to deploy. */
            model_id?: string;
            /** @description ID of the model build to deploy. */
            build_id?: string;
            /**
             * Format: double
             * @description Number of vCPU to allocate to the deployment.
             */
            cpu?: number;
            /**
             * Format: double
             * @description Amount of memory in GB to allocate to the deployment.
             */
            memory?: number;
            /**
             * Format: int32
             * @description Number of nvidia GPUs to allocate to the deployment.
             */
            nvidia_gpus?: number;
            /** @description Environment variables to run the deployment with. */
            environment?: {
                [key: string]: string;
            };
            /**
             * Format: int32
             * @description Number of Replications.
             */
            replicas?: number;
            /** Format: int64 */
            accelerator_label_id?: string;
            /**
             * Format: int32
             * @description The ID of the resource group associated with this model.
             */
            resource_group_id?: number;
            /**
             * Format: int32
             * @description The ID of the resource profile that determines the CPU and memory allocation for this model.
             */
            resource_profile_id?: number;
            /**
             * @description Write-only secrets for the deployment. Stored as a K8s Opaque Secret
             *     and volume-mounted into the pod at /etc/deployment-secrets/.
             *     NOT returned by GetModelDeployment — collaborators can use but not read these values.
             */
            deployment_secrets?: {
                [key: string]: string;
            };
        };
        /** @description Parameters for creating a model. */
        CreateModelRequest: {
            /** @description ID of the project containing the model. */
            project_id?: string;
            /** @description Name of the model. */
            name?: string;
            /** @description Description of the model. */
            description?: string;
            /**
             * Format: boolean
             * @description Whether to disable authentication for requests to deployments of this model.
             */
            disable_authentication?: boolean;
            /** @description Registered Model ID. */
            registered_model_id?: string;
            /**
             * optional userID of the service account to create/deploy the model
             *     when not passed, creator's userID will be used to create/deploy the model
             * Format: int32
             */
            run_as?: number;
            /** @description Visibility of the model. */
            visibility?: string;
            auto_build_config?: components["schemas"]["ShortCreateModelBuild"];
            auto_deployment_config?: components["schemas"]["ShortCreateModelDeployment"];
            /**
             * build the model after successful creation
             * Format: boolean
             */
            auto_build_model?: boolean;
            /**
             * deploy the model after successful creation and build. Only relevant when auto_build_model = true
             * Format: boolean
             */
            auto_deploy_model?: boolean;
            /** Format: int64 */
            accelerator_label_id?: string;
            /**
             * Format: int32
             * @description The ID of the resource group associated with this job.
             */
            resource_group_id?: number;
            /**
             * Format: int32
             * @description The ID of the resource profile that determines the CPU and memory allocation for this job.
             */
            resource_profile_id?: number;
        };
        /** Request to create gpu profile */
        CreateNodelLabelGpuProfileRequest: {
            /** Format: int64 */
            resource_group_id?: string;
            /** Format: int64 */
            gpu_count?: string;
            /** Format: double */
            cpu?: number;
            /** Format: double */
            memory?: number;
        };
        /** Response to create gpu profile call */
        CreateNodelLabelGpuProfileResponse: {
            accelerator_node_label?: components["schemas"]["AcceleratorNodeLabel"];
        };
        /** @description Parameters to create a new project. */
        CreateProjectRequest: {
            /** @description The name of the project to create. */
            name?: string;
            /** @description The description of the project. */
            description?: string;
            /** @description The visibility of the project (one of "public", "organization", "private"). Default is private. */
            visibility?: string;
            /** @description Optional parent project to fork. */
            parent_project?: string;
            /** @description Optional git URL to checkout for this project. */
            git_url?: string;
            /**
             * @description Optional template to use (Python, R, PySpark, Scala, Churn Predictor)
             *     Note: local will create the project but nothing else, files must be
             *     uploaded separately.
             */
            template?: string;
            /** @description If this is an organization-wide project, the visibility to others in the organization. */
            organization_permission?: string;
            /**
             * @description Whether this project uses legacy engines or runtimes. Valid values are
             *     "ml_runtime", "legacy_engine", or leave blank to default to the site-wide default.
             */
            default_project_engine_type?: string;
            /** The default set of environment variables to run */
            environment?: {
                [key: string]: string;
            };
            /**
             * Format: int32
             * @description Additional shared memory limit that engines in this project should have, in MB (default 64).
             */
            shared_memory_limit?: number;
            /**
             * pass value of team name if the owner of this new project should be a team and not a user
             *     invoker of the request should either be a member of that team or an admin
             */
            team_name?: string;
            /** @description Optional git ref to checkout for this project. */
            git_ref?: string;
        };
        /**
         * @description CreateRegisteredModelRequest request to create a registered model.
         *     If the model already exists a new version is added to the list of model versions.
         */
        CreateRegisteredModelRequest: {
            /** Project ID */
            project_id?: string;
            /** @description Experiment ID the run belongs to. */
            experiment_id?: string;
            /** @description ID of the ExperimentRun. */
            run_id?: string;
            /** @description Model path of model that is getting registered to model registry. */
            model_path?: string;
            /** Model name */
            model_name?: string;
            /** @description Tags for model. */
            tags?: components["schemas"]["Tag"][];
            /** @description Registered model description. */
            description?: string;
            /** @description Registered model version notes. */
            notes?: string;
            visibility?: components["schemas"]["Visibility"];
        };
        CreateRuntimeRepoRequest: {
            /** The name  of this runtime repo */
            name?: string;
            /** The URL of this runtime repo */
            url?: string;
        };
        /** @description Parameters for creating a synced team. */
        CreateSyncedTeamRequest: {
            /** Team name */
            username?: string;
            /** List of groups with their default permission */
            group_permissions?: components["schemas"]["GroupPermission"][];
            /** @description Bio of the team. */
            bio?: string;
        };
        /** @description Parameters for creating a team. */
        CreateTeamRequest: {
            /** @description ID of the project containing the model. */
            username?: string;
            /** type of the team like local/ldap/saml etc */
            type?: string;
            /** @description cn of the team. */
            cn?: string;
            /** @description bio of the team. */
            bio?: string;
            /** default permission of the members */
            permission?: string;
        };
        CreateV2KeyRequest: {
            /** username of the user whose V2 key you want to create */
            username?: string;
            /** expiry_date - optional */
            expiry_date?: string;
            /** comments - optional */
            comments?: string;
            /** the target audiences of the v2 key */
            audiences?: string[];
        };
        CreateV2KeyResponse: {
            /** New api_key */
            api_key?: string;
            /** New key_id */
            key_id?: string;
            /** New created_at */
            created_at?: string;
            /** New expiry_date */
            expiry_date?: string;
            /** New comments */
            comments?: string;
            /** New audiences */
            audiences?: string[];
        };
        CustomRuntimeImageDetails: {
            registry?: string;
            editor?: string;
            kernel?: string;
            edition?: string;
            version?: string;
            /** Format: int32 */
            maintenance_version?: number;
            description?: string;
        };
        DashboardsArchiveResponse: Record<string, never>;
        /**
         * @description Dataset. Represents a reference to data used for training, testing, or evaluation during
         *     the model development process.
         */
        Dataset: {
            /** The name of the dataset. E.g. “my.uc.table@2” “nyc-taxi-dataset”, “fantastic-elk-3” */
            name?: string;
            /**
             * @description Dataset digest, e.g. an md5 hash of the dataset that uniquely identifies it
             *     within datasets of the same name.
             */
            digest?: string;
            /**
             * @description Source information for the dataset. Note that the source may not exactly reproduce the
             *     dataset if it was transformed / modified before use with MLflow.
             */
            source_type?: string;
            /** @description The type of the dataset source, e.g. ‘databricks-uc-table’, ‘DBFS’, ‘S3’, ... */
            source?: string;
            /**
             * @description The schema of the dataset. E.g., MLflow ColSpec JSON for a dataframe, MLflow TensorSpec JSON
             *     for an ndarray, or another schema format.
             */
            schema?: string;
            /**
             * @description The profile of the dataset. Summary statistics for the dataset, such as the number of rows
             *     in a table, the mean / std / mode of each column in a table, or the number of elements
             *     in an array.
             */
            profile?: string;
        };
        /** @description DatasetInput. Represents a dataset and input tags. */
        DatasetInput: {
            /** A list of tags for the dataset input, e.g. a “context” tag with value “training” */
            tags?: components["schemas"]["Tag"][];
            dataset?: components["schemas"]["Dataset"];
        };
        /** Default quota information */
        DefaultQuotaInfo: {
            /** Format: int64 */
            id?: number;
            requests_memory?: string;
            requests_cpu?: string;
            requests_gpu?: string;
            /** Format: date-time */
            created_at?: string;
            /** Format: boolean */
            active?: boolean;
            owner_type?: string;
        };
        /** Details of a model's default replication policy */
        DefaultReplicationPolicy: {
            /**
             * Number of replicas to use for the model
             * Format: int64
             */
            num_replicas?: string;
            /** Type of replication to use (i.e. fixed) */
            type?: string;
        };
        /** Details of a model's default resources */
        DefaultResources: {
            /**
             * New number of cpu millicores for the model
             * Format: int64
             */
            cpu_millicores?: string;
            /**
             * New number of memory (in MB) for the model
             * Format: int64
             */
            memory_mb?: string;
            /**
             * New number of Nvidia GPUs for the model
             * Format: int64
             */
            nvidia_gpus?: string;
        };
        /** respnse after deleting an application */
        DeleteApplicationResponse: Record<string, never>;
        /** @description Response for deleting an embedding model. */
        DeleteCopilotEmbeddingModelResponse: Record<string, never>;
        /** @description Response for deleting a model. */
        DeleteCopilotModelResponse: Record<string, never>;
        /** Response to delete CPU profile */
        DeleteCpuProfileResponse: {
            /**
             * number of records deleted for cpu profile
             * Format: int32
             */
            rows_affected?: number;
        };
        DeleteDockerCredentialResponse: Record<string, never>;
        /** @description The response from deleting an experiment. */
        DeleteExperimentResponse: Record<string, never>;
        /** @description DeleteExperimentRunBatchRequest is used to  builk delete metrics, params, tags in one request. */
        DeleteExperimentRunBatchRequest: {
            project_id?: string;
            experiment_id?: string;
            /** ID of the ExperimentRun to log under */
            run_id?: string;
            /** @description List of metric names to be deleted. */
            metrics?: string[];
            /** @description List of param names to be deleted. */
            params?: string[];
            /** @description List of tags to be deleted. */
            tags?: string[];
        };
        /** DeleteExperimentRunBatchResponse response object to delete an experiment run batch */
        DeleteExperimentRunBatchResponse: Record<string, never>;
        /** @description Response object for deleting an experiment run. */
        DeleteExperimentRunResponse: Record<string, never>;
        /** @description Response to DELETE a job. */
        DeleteJobResponse: Record<string, never>;
        /** @description Response for deleting a model build. */
        DeleteModelBuildResponse: Record<string, never>;
        /** @description Response for deleting a model. */
        DeleteModelResponse: Record<string, never>;
        /** Request to delete gpu profile */
        DeleteNodelLabelGpuProfileResponse: {
            /**
             * number of records deleted for gpu profile
             * Format: int32
             */
            rows_affected?: number;
        };
        /** @description Response for deleting a project collaborator. */
        DeleteProjectCollaboratorResponse: Record<string, never>;
        /** @description Response object for deleting a file or directory. */
        DeleteProjectFileResponse: Record<string, never>;
        /** @description Response object when deleting a project. */
        DeleteProjectResponse: Record<string, never>;
        /** @description DeleteRegisteredModelResponse. */
        DeleteRegisteredModelResponse: Record<string, never>;
        /** @description DeleteRegisteredModelVersionResponse. */
        DeleteRegisteredModelVersionResponse: Record<string, never>;
        DeleteRuntimeRepoResponse: Record<string, never>;
        /** @description Response for deleting a team. */
        DeleteTeamResponse: Record<string, never>;
        /** @description Response for deleting a V2 key. */
        DeleteV2KeyResponse: Record<string, never>;
        /** @description Response for deleting all V2 keys. */
        DeleteV2KeysResponse: Record<string, never>;
        DiagBundleGenerateRequest: {
            start_time?: string;
            end_time?: string;
        };
        DiagBundleStatusResponse: {
            status?: components["schemas"]["DiagStatus"];
            start_time?: string;
            end_time?: string;
        };
        /**
         * @default DIAG_IN_PROGRESS
         * @enum {string}
         */
        DiagStatus: "DIAG_IN_PROGRESS" | "DIAG_COMPLETED" | "DIAG_FAILED" | "DIAG_NOT_STARTED";
        /** @description Parameters to update engines disablement. */
        DisableEnginesRequest: {
            /**
             * Status whether disabled or not
             * Format: boolean
             */
            disable_engines?: boolean;
        };
        /** @description Response for updating engines disablement. */
        DisableEnginesResponse: {
            /**
             * Projects that updated
             * Format: int32
             */
            rows_affected?: number;
            /**
             * Check status of the engines
             * Format: boolean
             */
            check?: boolean;
        };
        /**
         * @description List* type API calls should not respond with sensitive data,
         *     such as username or password.
         *     Therefore these API calls will return with this message.
         */
        DockerCredentialPublic: {
            id?: string;
            name?: string;
            server?: string;
            /** Format: boolean */
            is_default?: boolean;
        };
        /**
         * @description For updating a docker credential we need to have a data object
         *     with both the sensitive fields and the ID.
         */
        DockerCredentialSensitive: {
            id?: string;
            name?: string;
            server?: string;
            username?: string;
            password?: string;
            /** Format: boolean */
            is_default?: boolean;
        };
        /**
         * @description The various stages of an engine.
         * @default ENGINE_SCHEDULING
         * @enum {string}
         */
        EngineStatus: "ENGINE_SCHEDULING" | "ENGINE_STARTING" | "ENGINE_RUNNING" | "ENGINE_STOPPING" | "ENGINE_STOPPED" | "ENGINE_UNKNOWN" | "ENGINE_SUCCEEDED" | "ENGINE_FAILED" | "ENGINE_TIMEDOUT" | "ENGINE_SKIPPED";
        /** Workload execution details */
        ExecutionDetails: {
            /** The CRN of the workload */
            workload_crn?: string;
            /** The CRN of the execution */
            workload_execution_crn?: string;
            /** The CRN of the parent workload execution */
            parent_workload_execution_crn?: string;
            /** The name of the pod of the execution */
            pod_name?: string;
            /**
             * Unix timestamp of when the execution started
             * Format: date-time
             */
            start_time?: string;
            /**
             * Unix timestamp of when the execution ended
             * Format: date-time
             */
            end_time?: string;
            /**
             * The number of vCPU allocated for the execution (in cores)
             * Format: float
             */
            allocated_cpu_cores?: number;
            /**
             * The memory allocated for the execution (in GB)
             * Format: float
             */
            allocated_memory_gb?: number;
            /**
             * The number of Nvidia GPUs allocated for the execution
             * Format: float
             */
            allocated_gpu_cores?: number;
            /** The execution's status */
            status?: string;
            /** The failure reason for the execution, if it exists */
            failure_reason?: string;
            /** The crn of the user that executed the execution */
            run_as_user_crn?: string;
            /** The username of the user that executed the execution */
            run_as_user_name?: string;
            runtime?: components["schemas"]["RuntimeDetails"];
            /** The spark event log dir path for spark executors */
            spark_event_log_dir?: string;
            /**
             * The number of requested replicas for model deployments
             * Format: int32
             */
            requested_replicas?: number;
        };
        /**
         * @description Experiment is basically where a user can group and organize all the efforts
         *     that goes into developing a machine learning model.
         *     Experiment names are unique across workspaces.
         */
        Experiment: {
            /** @description Unique identifier for the experiment. */
            id?: string;
            /** Project ID */
            project_id?: string;
            /** @description Human readable name that identifies the experiment. */
            name?: string;
            /** @description Location where artifacts for the experiment are stored. */
            artifact_location?: string;
            /**
             * Format: date-time
             * @description Birth date in YYYY-MM-DDThh:mm:ss.uuZ format (ISO 8601 format).
             *     Output only.
             */
            readonly created_at?: string;
            /**
             * Format: date-time
             * @description Last update in YYYY-MM-DDThh:mm:ss.uuZ format (ISO 8601 format).
             *     Output only.
             */
            readonly updated_at?: string;
            /** @description Tags: Additional metadata key-value pairs. */
            tags?: components["schemas"]["Tag"][];
            /** @description lifecycle_stage shows the status of experiment. */
            lifecycle_stage?: string;
            user?: components["schemas"]["ShortUser"];
        };
        /** @description A single experiment run. */
        ExperimentRun: {
            /** @description Unique identifier for the ExperimentRun. */
            id?: string;
            /** @description Run Name. */
            name?: string;
            /** @description The experiment ID. */
            experiment_id?: string;
            user?: components["schemas"]["ShortUser"];
            status?: components["schemas"]["ExperimentRunStatus"];
            /**
             * Format: date-time
             * @description Unix timestamp of when the ExperimentRun started in milliseconds.
             */
            start_time?: string;
            /**
             * Format: date-time
             * @description Unix timestamp of when the ExperimentRun ended in milliseconds.
             */
            end_time?: string;
            /** @description Sub directory of actual experiment artifacts location. */
            artifact_uri?: string;
            data?: components["schemas"]["ExperimentRunData"];
            inputs?: components["schemas"]["ExperimentRunInputs"];
        };
        /** @description ExperimentRun data (metrics, params, and tags). */
        ExperimentRunData: {
            /** @description ExperimentRun metrics. */
            metrics?: components["schemas"]["Metric"][];
            /** @description ExperimentRun parameters. */
            params?: components["schemas"]["Tag"][];
            /** @description Additional metadata key-value pairs. */
            tags?: components["schemas"]["Tag"][];
            /** @description File location (relative to the experiment run's root artifact directory) and metadata for artifacts. */
            files?: components["schemas"]["FileInfo"][];
            /** @description RegisteredModelMetadata is used to show what model version is registered for this model. */
            registered_model_metadata?: components["schemas"]["RegisteredModelMetadata"][];
        };
        /** @description ExperimentRunInputs is dataset run input for the run. */
        ExperimentRunInputs: {
            /** @description Dataset input for the run. */
            dataset_inputs?: components["schemas"]["DatasetInput"][];
        };
        /**
         * @description The status of an ExperimentRun.
         *
         *      - EXPERIMENT_RUN_RUNNING: Run has been initiated.
         *      - EXPERIMENT_RUN_SCHEDULED: Run is scheduled to run at a later time.
         *      - EXPERIMENT_RUN_FINISHED: Run has completed.
         *      - EXPERIMENT_RUN_FAILED: Run execution failed.
         *      - EXPERIMENT_RUN_KILLED: Run killed by user.
         * @default EXPERIMENT_RUN_RUNNING
         * @enum {string}
         */
        ExperimentRunStatus: "EXPERIMENT_RUN_RUNNING" | "EXPERIMENT_RUN_SCHEDULED" | "EXPERIMENT_RUN_FINISHED" | "EXPERIMENT_RUN_FAILED" | "EXPERIMENT_RUN_KILLED";
        /** @description Metadata of a single file or directory. */
        FileInfo: {
            /**
             * @description The relative path to the file or directory.
             *     The path is relative to the base resource that this file represents.
             *     For example, if it's a project file/directory, it will be relative to /home/cdsw.
             *     Alternatively, if it's an experiment run artifact, it will be relative to the
             *     experiment run's root artifact directory.
             */
            path?: string;
            /**
             * Format: boolean
             * @description Whether the path is a directory.
             *     Output only.
             */
            readonly is_dir?: boolean;
            /**
             * Format: int64
             * @description Size in bytes. Unset for directories.
             *     Output only.
             */
            readonly file_size?: string;
        };
        /** Response containing default quota information for users */
        GetDefaultQuotaResponse: {
            quota?: components["schemas"]["DefaultQuotaInfo"];
            /** Format: boolean */
            success?: boolean;
        };
        GetDefaultQuotasResponse: {
            request_quotas?: components["schemas"]["DefaultQuotaInfo"][];
            /** Format: boolean */
            success?: boolean;
        };
        /** GetExperimentRunMetricsResponse returns all the metrics for a given value */
        GetExperimentRunMetricsResponse: {
            /** @description ExperimentRun metrics. */
            metrics?: components["schemas"]["Metric"][];
        };
        GroupPermission: {
            /** group name */
            cn?: string;
            /** permission */
            permission?: string;
        };
        GroupQuota: {
            group?: components["schemas"]["UserOrGroupInfo"];
            quota_usage?: components["schemas"]["Quota"];
            quota_configured?: components["schemas"]["Quota"];
        };
        /** @description One Job. */
        Job: {
            /**
             * @description Public identifier of the job.
             *     Output only.
             */
            readonly id?: string;
            /**
             * Format: double
             * @description vCPU cores available for the job.
             */
            cpu?: number;
            /**
             * Format: date-time
             * @description When the job was created.
             *     Output only.
             */
            readonly created_at?: string;
            creator?: components["schemas"]["ShortUser"];
            /**
             * Format: int64
             * @description ID of the engine image. Will be 0 if using runtimes.
             *     Output only.
             */
            readonly engine_image_id?: string;
            /**
             * @description English schedule.
             *     Output only.
             */
            readonly english_schedule?: string;
            /** @description Arguments to the job. */
            arguments?: string;
            /**
             * @description Type of job, whether it's "manual", "cron", or "dependent"
             *     Output only.
             */
            readonly type?: string;
            /** @description Kernel the job uses. */
            kernel?: string;
            /**
             * Format: double
             * @description Job memory in GB.
             */
            memory?: number;
            /** @description Job name. */
            name?: string;
            /** @description ID of the parent job - if the job is "dependent". */
            parent_id?: string;
            /**
             * Format: boolean
             * @description Whether the job is paused.
             *     Output only.
             */
            readonly paused?: boolean;
            /** @description The job schedule. */
            schedule?: string;
            /** @description The script to execute for the job. */
            script?: string;
            /**
             * Format: int64
             * @description Timeout of a job run for this job.
             */
            timeout?: string;
            /**
             * @description Timezone of the job if this is a scheduled job.
             *     Output only.
             */
            readonly timezone?: string;
            /**
             * Format: date-time
             * @description When the job was last updated.
             *     Output only.
             */
            readonly updated_at?: string;
            /** @description The default environment variables for the job, as JSON. */
            environment?: string;
            /**
             * Format: int32
             * @description The number of nvidia GPUs allocated for this job.
             */
            nvidia_gpu?: number;
            /**
             * @description The runtime image identifier if this is a runtime job. Will be blank if
             *     using engines.
             */
            runtime_identifier?: string;
            /** @description The runtime addons associated with this job. */
            runtime_addon_identifiers?: string[];
            /**
             * Format: boolean
             * @description Whether to kill this job when it times out.
             */
            kill_on_timeout?: boolean;
            project?: components["schemas"]["ShortProject"];
            owner?: components["schemas"]["ShortUser"];
            /**
             * userID of the service account that will be used to run the job.
             *     If 0 is returned, it means that job will run as the logged in user
             * Format: int32
             */
            run_as?: number;
            /**
             * Label to use for node selecting gpu/accelerator
             * Format: int64
             */
            accelerator_label_id?: string;
            /**
             * Format: boolean
             * @description Whether retry is enabled for the job (default false).
             */
            retry_enabled?: boolean;
            /**
             * Format: int32
             * @description Maximum number of retries (default 0).
             */
            max_retry?: number;
            /**
             * Format: int32
             * @description Delay in seconds before retrying (default 0).
             */
            retry_delay?: number;
            /**
             * Whether retry is enabled for script failures
             * Format: boolean
             */
            retry_for_script_failure?: boolean;
            /**
             * Whether retry is enabled for system failures
             * Format: boolean
             */
            retry_for_system_failure?: boolean;
            /**
             * Whether retry is enabled for timedout runs
             * Format: boolean
             */
            retry_for_timedout_runs?: boolean;
            /**
             * Whether retry is enabled for skipped runs
             * Format: boolean
             */
            retry_for_skipped_runs?: boolean;
            /**
             * @description An optional list of recipients to receive notifications for job events
             *     such as successful runs, failures, and manual stops.
             */
            recipients?: components["schemas"]["JobRecipient"][];
            /**
             * @description Files to attach (with path relative to /home/cdsw/) in notification emails.
             *     For example, to attach a file located at /home/cdsw/report/result.csv,
             *     include "report/result.csv" in the array for this field.
             */
            attachments?: string[];
            /** recipients that are notified when job succeeds */
            success_recipients?: string;
            /** recipients that are notified on when job fails */
            failure_recipients?: string;
            /** recipients that are notified when job times out */
            timeout_recipients?: string;
            /** recipients that are notified when job stops */
            stopped_recipients?: string;
            /**
             * Format: int32
             * @description The ID of the resource group associated with this job.
             */
            resource_group_id?: number;
            /**
             * Format: int32
             * @description The ID of the resource profile that determines the CPU and memory allocation for this job.
             */
            resource_profile_id?: number;
        };
        /** Recipients of a job */
        JobRecipient: {
            /** Recipient's email */
            email?: string;
            /**
             * Format: boolean
             * @description Whether to notify on job success.
             */
            notify_on_success?: boolean;
            /**
             * Format: boolean
             * @description Whether to notify on job failure.
             */
            notify_on_failure?: boolean;
            /**
             * Format: boolean
             * @description Whether to notify on job timeout.
             */
            notify_on_timeout?: boolean;
            /**
             * Format: boolean
             * @description Whether to notify when the job is stopped.
             */
            notify_on_stop?: boolean;
        };
        /** @description A single instance of a job run. */
        JobRun: {
            /** @description The project that this job run belongs to. This is an opaque identifier. */
            project_id?: string;
            /** @description The job that this job run belongs to. This is an opaque identifier. */
            job_id?: string;
            status?: components["schemas"]["EngineStatus"];
            /** @description The alphanumeric identifier for the job run. */
            id?: string;
            /**
             * Format: date-time
             * @description The timestamp of when the job run was created.
             */
            created_at?: string;
            /**
             * Format: date-time
             * @description The timestamp the job run was scheduled at.
             */
            scheduling_at?: string;
            /**
             * Format: date-time
             * @description The tiemstamp the job run started being processed.
             */
            starting_at?: string;
            /**
             * Format: date-time
             * @description The timestamp the job run started running.
             */
            running_at?: string;
            /**
             * Format: date-time
             * @description The timestamp the job run finished.
             */
            finished_at?: string;
            /**
             * @description The kernel of the job run. This value is inherited from the job when the
             *     job run is started. If the job is later edited, this will still
             *     represent the kernel this job run ran with.
             */
            kernel?: string;
            /**
             * Format: double
             * @description The number of vCPU allocated for the job run (in cores). This value is
             *     inherited from the job when the job run is started. If the job is later
             *     edited, this will still represent the number of CPU this job run ran
             *     with.
             */
            cpu?: number;
            /**
             * Format: double
             * @description The amount of memory allocated for the job run (in GB). This value is
             *     inherited from the job when the job run is started. If the job is later
             *     edited, this will still represent the amount of memory this job run ran
             *     with.
             */
            memory?: number;
            /**
             * Format: int32
             * @description The number of Nvidia GPUs allocated for the job run. This value is
             *     inherited from the job when the job run is started. If the job is later
             *     edited, this will still represent the number of GPUs this job run ran
             *     with.
             */
            nvidia_gpu?: number;
            /** @description The custom arguments to the job run. */
            arguments?: string;
            /** The custom environment for the job run */
            environment?: string;
            creator?: components["schemas"]["ShortUser"];
            /**
             * @description The runtime image identifier if this used a runtime engine.
             *     Blank if this used a legacy engine.
             */
            runtime_identifier?: string;
            /**
             * Format: int32
             * @description The ID of the resource group associated with this job.
             */
            resource_group_id?: number;
        };
        /** Kubernetes Info */
        K8SInfo: {
            /**
             * kubernetes exit code
             * Format: int32
             */
            k8s_exit_code?: number;
            /** kubernetes signal */
            k8s_signal?: string;
            /** kubernetes reason */
            k8s_reason?: string;
            /** kubernetes message */
            k8s_message?: string;
        };
        /** Response for Sync Status Details */
        LatestSyncStatusResponse: {
            id?: string;
            sync_type?: string;
            sync_model?: string;
            status?: string;
            logs?: string;
            message?: string;
            created_at?: string;
            /**
             * following fields can be with default values 0
             * Format: int32
             */
            total_synced_users?: number;
            /** Format: int32 */
            total_active_users?: number;
            /** Format: int32 */
            total_deactivated_users?: number;
            /** Format: int32 */
            total_synced_teams?: number;
            /** Format: int32 */
            total_active_teams?: number;
            /** Format: int32 */
            total_deactivated_teams?: number;
            synced_by?: string;
        };
        ListAcceleratorBasedTeamQuotaResponse: {
            accelerator_based_team_quota?: components["schemas"]["AcceleratorBasedTeamQuota"][];
            /** @description A token to fetch the next page of accelerator node labels. */
            next_page_token?: string;
        };
        ListAcceleratorBasedUserQuotaResponse: {
            accelerator_based_user_quota?: components["schemas"]["AcceleratorBasedUserQuota"][];
            /** @description A token to fetch the next page of accelerator node labels. */
            next_page_token?: string;
        };
        ListAllAcceleratorsNodeLabelsResponse: {
            accelerator_node_label?: components["schemas"]["AcceleratorNodeLabel"][];
            /** @description A token to fetch the next page of accelerator node labels. */
            next_page_token?: string;
        };
        ListAllResourceGroupsResponse: {
            resource_group?: components["schemas"]["ResourceGroup"][];
            /** @description A token to fetch the next page of accelerator node labels. */
            next_page_token?: string;
        };
        ListAllRunAsMachineUserCollaboratorsResponse: {
            run_as_machine_user_collaborators?: components["schemas"]["RunAsMachineUserCollaborator"][];
            /**
             * @description Next page token is a value that can be added to a new ListProjectCollaborators call to fetch
             *     the next page of projects, if any remain.
             */
            next_page_token?: string;
        };
        /** @description Response object when GETting a list of applications. */
        ListApplicationsResponse: {
            /** applications is a list of application */
            applications?: components["schemas"]["Application"][];
            /**
             * @description Next page token is a value that can be added to a new ListApplications call to fetch
             *     the next page of projects, if any remain.
             */
            next_page_token?: string;
        };
        /** @description Response for listing Copilot embedding models. */
        ListCopilotEmbeddingModelsResponse: {
            /** @description The copilot models in this page. */
            copilot_embedding_models?: components["schemas"]["CopilotEmbeddingModel"][];
            /** @description The page token for the next page. */
            next_page_token?: string;
        };
        /** @description Response for listing Copilot models. */
        ListCopilotModelsResponse: {
            /** @description The copilot models in this page. */
            copilot_models?: components["schemas"]["CopilotModel"][];
            /** @description The page token for the next page. */
            next_page_token?: string;
        };
        /** Response for listing CPU resource profiles */
        ListCpuProfilesResponse: {
            cpu_resource_profiles?: components["schemas"]["CpuProfile"][];
            /** @description A token to fetch the next page of cpu profiles. */
            next_page_token?: string;
        };
        ListDockerCredentialsResponse: {
            /** list of Docker Credentials */
            docker_credentials?: components["schemas"]["DockerCredentialPublic"][];
            /** @description Next page token. */
            next_page_token?: string;
        };
        /** @description List experiments runs response contains an array of experiment runs. */
        ListExperimentRunsResponse: {
            /** @description ExperimentRuns that match the search criteria. */
            experiment_runs?: components["schemas"]["ExperimentRun"][];
            /**
             * @description Next page token is a value that can be added to a new ListJobs call to fetch
             *     the next page of jobs, if any remain.
             */
            next_page_token?: string;
        };
        /** ListExperimentsResponse containes array of experiment objects */
        ListExperimentsResponse: {
            experiments?: components["schemas"]["Experiment"][];
            /**
             * @description Next page token is a value that can be added to a new ListJobs call to fetch
             *     the next page of jobs, if any remain.
             */
            next_page_token?: string;
        };
        ListGroupsQuotaResponse: {
            /** list of user quotas */
            group_quota?: components["schemas"]["GroupQuota"][];
            /** @description Next page token. */
            next_page_token?: string;
            /**
             * total count of groups quota
             * Format: int64
             */
            total_count?: string;
        };
        /** @description Zero or more job runs. */
        ListJobRunsResponse: {
            /** @description A list of job runs. */
            job_runs?: components["schemas"]["JobRun"][];
            /** @description A token for the next page of job runs. */
            next_page_token?: string;
        };
        /** @description Response object when GETting a list of jobs. */
        ListJobsResponse: {
            /** @description Jobs is the response object with details on a list of jobs. */
            jobs?: components["schemas"]["Job"][];
            /**
             * @description Next page token is a value that can be added to a new ListJobs call to fetch
             *     the next page of jobs, if any remain.
             */
            next_page_token?: string;
        };
        /**
         * Response object for the ListMlServingApps method.
         *     This is duplicated from https://github.infra.cloudera.com/Sense/mlx-crud-app/blob/master/service/proto/ml.proto
         */
        ListMlServingAppsResponse: {
            /** @description The list of Apps. */
            apps?: components["schemas"]["MlServingApp"][];
        };
        /** @description Response for listing model builds. */
        ListModelBuildsResponse: {
            /** @description The page of model builds. */
            model_builds?: components["schemas"]["ModelBuild"][];
            /** @description The next page token. */
            next_page_token?: string;
        };
        /** @description Response for listing model deployments. */
        ListModelDeploymentsResponse: {
            /** @description The page of model deployments. */
            model_deployments?: components["schemas"]["ModelDeployment"][];
            /** @description The next page token. */
            next_page_token?: string;
        };
        /** @description Response for listing models. */
        ListModelsResponse: {
            /** @description The models in this page. */
            models?: components["schemas"]["Model"][];
            /** @description The page token for the next page. */
            next_page_token?: string;
        };
        ListNewsFeedsResponse: {
            feeds?: components["schemas"]["NewsFeed"][];
            next_page_token?: string;
        };
        /** @description Response for getting project collaborators. */
        ListProjectCollaboratorsResponse: {
            /** The collaborators of the project */
            collaborators?: components["schemas"]["Collaborator"][];
            /**
             * @description Next page token is a value that can be added to a new ListProjectCollaborators call to fetch
             *     the next page of projects, if any remain.
             */
            next_page_token?: string;
        };
        /** @description Response object for listing project files. */
        ListProjectFilesResponse: {
            /** @description The files/directories in the provided path. */
            files?: components["schemas"]["FileInfo"][];
        };
        ListProjectNamesResponse: {
            /** list of project names */
            project_names?: string[];
            /** @description Next page token. */
            next_page_token?: string;
        };
        /** @description Response object when GETting a list of projects. */
        ListProjectsResponse: {
            /** @description Projects is the response object with details on a list of projects. */
            projects?: components["schemas"]["Project"][];
            /**
             * @description Next page token is a value that can be added to a new ListProjects call to fetch
             *     the next page of projects, if any remain.
             */
            next_page_token?: string;
        };
        /** @description ListRegisteredModelsResponse returns a list of registered models. */
        ListRegisteredModelsResponse: {
            /** @description List of registered models. */
            models?: components["schemas"]["RegisteredModelDetails"][];
            /** @description Next page token. */
            next_page_token?: string;
        };
        /** @description Response for listing runtime addons. */
        ListRuntimeAddonsResponse: {
            /** The page of runtime addons; */
            runtime_addons?: components["schemas"]["RuntimeAddon"][];
            /** @description A token to fetch the next page of runtime addons. */
            next_page_token?: string;
        };
        ListRuntimeReposResponse: {
            /** list of RuntimeRepos */
            runtimerepos?: components["schemas"]["RuntimeRepo"][];
            /** @description Next page token. */
            next_page_token?: string;
        };
        /** @description Response for listing runtimes. */
        ListRuntimesResponse: {
            /** @description The page of runtimes. */
            runtimes?: components["schemas"]["Runtime"][];
            /** @description A token to fetch the next page of runtimes. */
            next_page_token?: string;
        };
        ListSyncedTeamGroupsResponse: {
            groups?: components["schemas"]["SyncedTeamGroup"][];
        };
        /** Response to list synced team members with cdp group info */
        ListSyncedTeamMembersResponse: {
            members?: components["schemas"]["OrganizationMembersWithGroupNames"][];
        };
        ListTeamsAcceleratorQuotaResponse: {
            /** list of team accelerator quotas */
            team_accelerator_quota?: components["schemas"]["TeamAcceleratorQuota"][];
            /** @description Next page token. */
            next_page_token?: string;
            /**
             * total count of team accelerator quotas
             * Format: int64
             */
            total_count?: string;
        };
        /** Response object for usage view */
        ListUsageResponse: {
            /** list of usage response */
            usage_response?: components["schemas"]["UsageResponse"][];
            /**
             * total number of responses satisfying the request filter conditions
             * Format: int64
             */
            total_count?: string;
            /** @description Next page token. */
            next_page_token?: string;
        };
        ListUsersAcceleratorQuotaResponse: {
            /** list of user quotas */
            user_accelerator_quota?: components["schemas"]["UserAcceleratorQuota"][];
            /** @description Next page token. */
            next_page_token?: string;
            /**
             * total count of users quota
             * Format: int64
             */
            total_count?: string;
        };
        ListUsersQuotaResponse: {
            /** list of user quotas */
            user_quota?: components["schemas"]["UserQuota"][];
            /** @description Next page token. */
            next_page_token?: string;
            /**
             * total count of users quota
             * Format: int64
             */
            total_count?: string;
        };
        ListV2KeysResponse: {
            /**
             * individual key is same as that of the createV2KeyResponse
             *     all keys is just array of that response
             */
            keys?: components["schemas"]["V2KeyDetails"][];
        };
        ListWorkloadExecutionsResponse: {
            /** List of workloads */
            workloads?: components["schemas"]["WorkloadDetails"][];
            /** List of executions for all workloads */
            executions?: components["schemas"]["ExecutionDetails"][];
            /** @description A token to fetch the next page of workloads and executions. */
            next_page_token?: string;
        };
        /** Response object for workload status */
        ListWorkloadStatusResponse: {
            /** list of workload status */
            workload_status?: string[];
        };
        /** Response object for workload type */
        ListWorkloadTypesResponse: {
            /** list of workload types */
            workload_type?: string[];
        };
        /**
         * @description LogExperimentRunBatchRequest is used to bulk update ExperimentRun details
         *     like metrics, params, and tags in one request.
         */
        LogExperimentRunBatchRequest: {
            project_id?: string;
            experiment_id?: string;
            /** ID of the ExperimentRun to log under */
            run_id?: string;
            /** @description Metrics to log. */
            metrics?: components["schemas"]["Metric"][];
            /** @description Params to log. */
            params?: components["schemas"]["Tag"][];
            /** @description Tags to log. */
            tags?: components["schemas"]["Tag"][];
            /** @description MLmodel file in json format. */
            model_json?: string;
        };
        /** @description Response object to log an experiment batch. */
        LogExperimentRunBatchResponse: Record<string, never>;
        /**
         * @default MLFLOW
         * @enum {string}
         */
        MLOPSType: "MLFLOW" | "SIMPLE";
        /** @description MLflowMetadata is an mlflow model metadata. */
        MLflowMetadata: {
            /** @description Experiment ID the run belongs to. */
            experiment_id?: string;
            /** @description Run ID. */
            run_id?: string;
            /** @description Metrics for the run. */
            metrics?: components["schemas"]["Metric"][];
            /** @description ExperimentRun parameters. */
            params?: components["schemas"]["Tag"][];
            /** @description Additional metadata key-value pairs. */
            tags?: components["schemas"]["Tag"][];
        };
        /** @description Metric associated with a ExperimentRun, represented as a key-value pair. */
        Metric: {
            /** @description Key identifying this metric. */
            key?: string;
            /**
             * Format: double
             * @description Value associated with this metric.
             */
            value?: number;
            /**
             * Format: date-time
             * @description The timestamp at which this metric was recorded.
             */
            timestamp?: string;
            /**
             * Format: int64
             * @description Step at which to log the metric.
             */
            step?: string;
        };
        /**
         * The Cloudera AI Inference Service instance.
         *     This is a subset of the message from https://github.infra.cloudera.com/Sense/mlx-crud-app/blob/master/service/proto/ml.proto
         */
        MlServingApp: {
            /** @description The name of the Cloudera AI Inference Service instance. */
            app_name?: string;
            /** @description The CRN of the Cloudera AI Inference Service instance. */
            app_crn?: string;
            /** @description The CRN of the environment. */
            environment_crn?: string;
            /** @description The name of the environment. */
            environment_name?: string;
            /** @description The namespace used for this service. */
            namespace?: string;
            /** @description The email of the user who created this service. */
            owner_email?: string;
            /** @description The Cloudera AI Inference Service version running on this instance. */
            ml_serving_version?: string;
            /**
             * Format: boolean
             * @description Is this service installed on a private cluster.
             */
            is_private_cluster?: boolean;
            /**
             * Format: date-time
             * @description Creation date of Cloudera AI Inference Service instance.
             */
            creation_date?: string;
            /** @description Kubernetes cluster domain name of Cloudera AI Inference Service instance. */
            cluster_domain?: string;
            /** @description The status of the Cloudera AI Inference Service instance. */
            status?: string;
            /**
             * Format: boolean
             * @description Indicates if this Cloudera AI Inference Service instance uses a public load balancer.
             */
            use_public_load_balancer?: boolean;
            /**
             * Format: boolean
             * @description Indicates if HTTPs communication was enabled on this application when it was provisioned.
             */
            https_enabled?: boolean;
            /** @description The cloud platform of the environment that was used to create this instance. */
            cloud_platform?: string;
        };
        /** @description One model. */
        Model: {
            /**
             * @description ID of the model.
             *     A model CRN looks like <workspace CRN>/<UUID>. The model ID is the UUID portion of the CRN.
             */
            id?: string;
            /** @description The name of the model. */
            name?: string;
            /** @description The description of the model. */
            description?: string;
            creator?: components["schemas"]["ShortUser"];
            /** @description The model's access key. */
            access_key?: string;
            /** @description The models deletion status. */
            deletion_status?: string;
            /**
             * Format: date-time
             * @description When the model was created.
             */
            created_at?: string;
            /**
             * Format: date-time
             * @description When the model was last updated.
             */
            updated_at?: string;
            /** @description CRN of the model. */
            crn?: string;
            /**
             * Format: boolean
             * @description Enable model authentication.
             */
            auth_enabled?: boolean;
            project?: components["schemas"]["ShortProject"];
            /** @description Registered Model ID reference to model Regisry. */
            registered_model_id?: string;
            /** @description Visibility of the model. */
            visibility?: string;
            default_resources?: components["schemas"]["DefaultResources"];
            default_replication_policy?: components["schemas"]["DefaultReplicationPolicy"];
            /**
             * userID of the service account that should be used to create/deploy the model
             *     When it is empty, creator's userID is used
             * Format: int32
             */
            run_as?: number;
            /**
             * Label to use for node selecting gpu/accelerator
             * Format: int64
             */
            accelerator_label_id?: string;
            /**
             * Format: int32
             * @description The ID of the resource group associated with this application.
             */
            resource_group_id?: number;
            /**
             * Format: int32
             * @description The ID of the resource profile that determines the CPU and memory allocation for this model.
             */
            resource_profile_id?: number;
        };
        /** @description A single model build. */
        ModelBuild: {
            /** @description ID of the model build. */
            id?: string;
            /** @description ID of the model containing the build. */
            model_id?: string;
            creator?: components["schemas"]["ShortUser"];
            /** @description The comment associated with the build. */
            comment?: string;
            /** @description Path from the project root to the file to build. */
            file_path?: string;
            /** @description Name of the function to run. */
            function_name?: string;
            /** @description The engine image to build the model with. */
            engine_image?: string;
            /** @description The kernel to run the build with. */
            kernel?: string;
            /**
             * Format: date-time
             * @description When the model build was created.
             */
            created_at?: string;
            /**
             * Format: date-time
             * @description When the model build was most recently updated.
             */
            updated_at?: string;
            /** @description Status of the build. */
            status?: string;
            /** @description State of the deletion of the build. */
            deletion_status?: string;
            /** @description CRN of the build. */
            crn?: string;
            /**
             * Format: date-time
             * @description When the model build was most recently updated.
             */
            built_at?: string;
            /** @description Runtime identifier if this model uses runtimes. */
            runtime_identifier?: string;
            /** @description Runtime addons if this model uses runtimes. */
            runtime_addon_identifiers?: string[];
            /** @description ID of the registered model version. */
            registered_model_version_id?: string;
            /** Root folder to be used for file_path */
            model_root_dir?: string;
            /** Custom build script path */
            build_script_path?: string;
        };
        /** @description A single model deployment. */
        ModelDeployment: {
            project_id?: string;
            /** @description ID of the model containing the deployment. */
            model_id?: string;
            /** @description ID of the build containing the deployment. */
            build_id?: string;
            /**
             * @description ID of the model deployment.
             *     This is derived from the model deployment CRN. The model deployment CRN is of the
             *     form <workspace CRN>/<UUID>, and this ID is the UUID portion of the model deployment CRN.
             */
            id?: string;
            /**
             * Format: double
             * @description Number of vCPUs allocated to this deployment.
             */
            cpu?: number;
            /**
             * Format: double
             * @description Amount of memory to allocate to this deployment.
             */
            memory?: number;
            /**
             * Format: int32
             * @description Number of Nvidia GPUs to allocate to  this project.
             */
            nvidia_gpu?: number;
            /** @description Environment variables to run the deployment with. */
            environment?: string;
            /**
             * Format: date-time
             * @description When the deployment was created.
             */
            created_at?: string;
            /**
             * Format: date-time
             * @description When the deployment was last updated.
             */
            updated_at?: string;
            /**
             * Format: date-time
             * @description When the deployment was stopped.
             */
            stopped_at?: string;
            /** @description CRN of the model deployment. */
            crn?: string;
            deployer?: components["schemas"]["ShortUser"];
            /** @description The status of the model deployment. */
            status?: string;
            /**
             * Format: int32
             * @description Number of Replicas.
             */
            replicas?: number;
            /** Format: int64 */
            accelerator_label_id?: string;
            /**
             * Format: int32
             * @description The ID of the resource group associated with this deployment.
             */
            resource_group_id?: number;
            /**
             * Format: int32
             * @description The ID of the resource profile that determines the CPU and memory allocation for this deployment.
             */
            resource_profile_id?: number;
        };
        /** @description ModelVersionMetadata is a model version metadata. */
        ModelVersionMetadata: {
            mlops_type?: components["schemas"]["MLOPSType"];
            /** @description tags for model. */
            tags?: components["schemas"]["Tag"][];
            /** @description Workspace URL to track back the model origins. */
            workspace_url?: string;
            /** @description Project ID. */
            project_id?: string;
            owner?: components["schemas"]["ShortUser"];
            mlflow_metadata?: components["schemas"]["MLflowMetadata"];
            simple_metadata?: components["schemas"]["SimpleMetadata"];
        };
        NewsFeed: {
            title?: string;
            description?: string;
            category?: string;
            tags?: string[];
            link?: string;
            imgpath?: string;
            /** Format: boolean */
            is_viewed?: boolean;
            /**
             * Format: date-time
             * @description created at YYYY-MM-DDThh:mm:ss.uuZ format (ISO 8601 format).
             */
            date?: string;
            icon?: string;
            /** Format: boolean */
            is_new?: boolean;
            description_html?: string;
        };
        /** Synced team member details with cdp group info */
        OrganizationMembersWithGroupNames: {
            /** Format: int64 */
            id?: string;
            /**
             * team id
             * Format: int64
             */
            organization_id?: string;
            /**
             * team member id
             * Format: int64
             */
            user_id?: string;
            /** team member effective permission */
            permission?: string;
            /**
             * boolean flag indicating if the member's permission is inherited from groups or set custom within the team
             * Format: boolean
             */
            inherit_permission_from_groups?: boolean;
            /**
             * created at
             * Format: date-time
             */
            created_at?: string;
            /**
             * updated at
             * Format: date-time
             */
            updated_at?: string;
            user?: components["schemas"]["TeamMemberPublic"];
            /** list of groups the team member belongs to */
            group_names?: string[];
        };
        /** @description One project. */
        Project: {
            /**
             * @description An opaque public identifier for the project.
             *     Output only.
             */
            readonly id?: string;
            /** @description The short name; does not include user/team. */
            name?: string;
            owner?: components["schemas"]["ShortUser"];
            creator?: components["schemas"]["ShortUser"];
            /** @description Describes the project. */
            description?: string;
            /** Visibility of the project: "public", "organization", or "private" */
            visibility?: string;
            /** @description Whether this project uses engines or runtimes: "ml_runtime" or "legacy_engine". */
            default_engine_type?: string;
            /**
             * Format: date-time
             * @description Birth date in YYYY-MM-DDThh:mm:ss.uuZ format (ISO 8601 format).
             *     Output only.
             */
            readonly created_at?: string;
            /**
             * Format: date-time
             * @description Last update in YYYY-MM-DDThh:mm:ss.uuZ format (ISO 8601 format).
             *     Output only.
             */
            readonly updated_at?: string;
            /**
             * @description Creation status of the project (e.g. creating, success, failure)
             *     Output only.
             */
            readonly creation_status?: string;
            permissions?: components["schemas"]["ProjectPermissions"];
            /**
             * Format: int32
             * @description Additional shared memory limit that each engine in this project has, in MB.
             */
            shared_memory_limit?: number;
            /** @description The environment variables configured for this project. */
            environment?: string;
            /**
             * Format: int32
             * @description The ephemeral storage requested for the project, in GB.
             */
            ephemeral_storage_request?: number;
            /**
             * Format: int32
             * @description The ephemeral storage limit for the project, in GB.
             */
            ephemeral_storage_limit?: number;
            /** Slug information of the Project */
            slug?: string;
        };
        /** A workload's project details */
        ProjectDetails: {
            /**
             * The ID of the project
             * Format: int64
             */
            id?: number;
            /** The CRN of the project */
            crn?: string;
            /** The name of the project */
            name?: string;
            /** The CRN of the user that created the project */
            created_by_crn?: string;
            /** The username of user that created the project */
            created_by_name?: string;
            owner?: components["schemas"]["ProjectOwnerDetails"];
        };
        /** Project information */
        ProjectInfo: {
            /**
             * project id
             * Format: int64
             */
            id?: number;
            /** project slug */
            slug?: string;
            /** html_url of the project */
            html_url?: string;
            /** url of the project */
            url?: string;
        };
        /** A workload's project's owner's details */
        ProjectOwnerDetails: {
            /**
             * The ID of the owner
             * Format: int64
             */
            id?: number;
            /** The CRN of the owner */
            crn?: string;
            /** The username of the owner */
            name?: string;
            /**
             * If the owner is a team or not
             * Format: boolean
             */
            is_team?: boolean;
        };
        /** @description Permissions for a user inside a project. */
        ProjectPermissions: {
            /**
             * Format: boolean
             * @description Read-only, aka Viewer. Can view code, data, and results.
             */
            read?: boolean;
            /**
             * Format: boolean
             * @description Read-write, aka Contributor. Can view and modify all project resources.
             */
            write?: boolean;
            /**
             * Format: boolean
             * @description Administrator. Can view and modify all project resources,
             *     add new collaborators, and delete the project.
             */
            admin?: boolean;
            /**
             * Format: boolean
             * @description business_user can access application.
             */
            business_user?: boolean;
            /**
             * Format: boolean
             * @description operator can start or stop pre-existing jobs.
             */
            operator?: boolean;
            /**
             * Format: boolean
             * @description inherit is meant to be used only for teams.
             */
            inherit?: boolean;
        };
        Quota: {
            /** CPU quota */
            cpu?: string;
            /** Memory quota */
            memory?: string;
            /** Nvidia GPU quota */
            nvidia_gpu?: string;
        };
        ReadBaseClusterSparkDefaultResponse: {
            base_cluster_spark_default?: components["schemas"]["BaseClusterSparkDefault"][];
        };
        ReadCMLSparkDefaultResponse: {
            cml_spark_default?: string;
        };
        ReadWorkspaceSparkDefaultResponse: {
            workspace_spark_default?: string;
            is_pushdown?: string;
        };
        RegisterCustomRuntimeRequest: {
            url?: string;
            docker_credential_id?: string;
        };
        RegisterCustomRuntimeResponse: {
            /** Format: boolean */
            validation_success?: boolean;
            /** Format: boolean */
            insert_success?: boolean;
            reason?: string;
            reason_data?: string;
            details?: components["schemas"]["CustomRuntimeImageDetails"];
        };
        RegisteredModel: {
            /** @description Model ID. */
            model_id?: string;
            /** @description Model name. */
            name?: string;
            /** @description Model description. */
            description?: string;
            owner?: components["schemas"]["ShortUser"];
            /** @description Permission of the user requesting the model. */
            permission?: string;
            visibility?: components["schemas"]["Visibility"];
            /**
             * Format: date-time
             * @description Model creation time.
             */
            created_at?: string;
            /**
             * Format: date-time
             * @description Model last updated time.
             */
            updated_at?: string;
            /**
             * Format: int32
             * @description Model version count.
             */
            count?: number;
            /** @description Registered model versions list. */
            model_versions?: components["schemas"]["RegisteredModelVersion"][];
            /** @description next_page_token is a token to get the next page of results. */
            next_page_token?: string;
        };
        RegisteredModelDetails: {
            /** @description Model ID. */
            model_id?: string;
            /** @description Model name. */
            name?: string;
            /** @description Model description. */
            description?: string;
            owner?: components["schemas"]["ShortUser"];
            /** @description Permission of the user requesting the model. */
            permission?: string;
            visibility?: components["schemas"]["Visibility"];
            /**
             * Format: date-time
             * @description Model creation time.
             */
            created_at?: string;
            /**
             * Format: date-time
             * @description Model last updated time.
             */
            updated_at?: string;
            /**
             * Format: int32
             * @description Model version count.
             */
            count?: number;
            /** @description next_page_token is a token to get the next page of results. */
            next_page_token?: string;
        };
        /** @description RegisteredModelMetadata is used to represent model version metadata. */
        RegisteredModelMetadata: {
            /** @description model_path artifact folder name. */
            model_path?: string;
            /** @description model_name. */
            model_name?: string;
            /** @description model_id of the registered model id. */
            model_id?: string;
            /** @description model_version_id of the. */
            model_version_id?: string;
            /**
             * Format: int32
             * @description count of the model version.
             */
            version_number?: number;
            /** @description run_id of the experiment run. */
            run_id?: string;
            /**
             * Format: date-time
             * @description created_at timestamp of model registered.
             */
            created_at?: string;
        };
        /** @description RegisteredModelVersion is a model version. */
        RegisteredModelVersion: {
            /** @description Model ID. */
            model_id?: string;
            /** @description Model version ID. */
            model_version_id?: string;
            /** @description Model version name. */
            version_name?: string;
            /**
             * Format: int32
             * @description Model version number.
             */
            number?: number;
            /** @description Model version description. */
            notes?: string;
            user?: components["schemas"]["ShortUser"];
            /**
             * Format: date-time
             * @description Model version creation time.
             */
            created_at?: string;
            /**
             * Format: date-time
             * @description Model version last updated time.
             */
            updated_at?: string;
            /** @description Model version status. */
            status?: string;
            model_version_metadata?: components["schemas"]["ModelVersionMetadata"];
            /** @description Model version tags. */
            tags?: components["schemas"]["Tag"][];
            /** @description Error message for failed uploads/deletions. */
            error_message?: string;
        };
        /** Response to remove a cdp group from a synced team */
        RemoveGroupFromSyncedTeamResponse: Record<string, never>;
        ResourceGroup: {
            /** Format: int32 */
            id?: number;
            name?: string;
            instance_group_name?: string;
            instance_type?: string;
            /** Format: int32 */
            cpu_count?: number;
            /** Format: int64 */
            gpu_count?: string;
            /** Format: int32 */
            memory_in_gib?: number;
            /** Format: int64 */
            gpumemory_in_gib?: string;
            gpu_model?: string;
            gpu_type?: string;
            /** Format: boolean */
            allow_jobs?: boolean;
            /** Format: boolean */
            allow_sessions?: boolean;
            /** Format: boolean */
            allow_models?: boolean;
            /** Format: boolean */
            allow_applications?: boolean;
            /** Format: int32 */
            autoscale_min?: number;
            /** Format: int32 */
            autoscale_max?: number;
            /** Format: date-time */
            rg_updated_at?: string;
        };
        /** Update fields for a resource group */
        ResourceGroupUpdateFields: {
            /** Format: int32 */
            id?: number;
            /** Format: boolean */
            allow_jobs?: boolean;
            /** Format: boolean */
            allow_sessions?: boolean;
            /** Format: boolean */
            allow_models?: boolean;
            /** Format: boolean */
            allow_applications?: boolean;
        };
        RotateV1KeyRequest: {
            /** username of the user whose V1 key you want to rotate */
            username?: string;
            /** api_key_expiry_date - optional */
            api_key_expiry_date?: string;
            /** api_key_comments - optional */
            api_key_comments?: string;
        };
        RotateV1KeyResponse: {
            /** New api_key */
            api_key?: string;
            /** New api_key_hash */
            api_key_hash?: string;
            /** New api_key_expiry_date */
            api_key_expiry_date?: string;
            /** New api_key_comments */
            api_key_comments?: string;
        };
        RunAsMachineUserCollaborator: {
            /** Format: int32 */
            user_id?: number;
            user_name?: string;
        };
        /** @description A single runtime. */
        Runtime: {
            /** @description The identifier for this runtime. */
            image_identifier?: string;
            /** @description The editor configured for this runtime. */
            editor?: string;
            /** @description The kernel associated with this runtime. */
            kernel?: string;
            /** @description The edition of this runtime. */
            edition?: string;
            /** @description A short description of the runtime. */
            description?: string;
            /** @description The full version of the runtime. */
            full_version?: string;
            /** @description Status of the runtime. */
            status?: string;
            /**
             * User ID of the user who registered the runtime
             * Format: int32
             */
            register_user_id?: number;
        };
        /** @description A single runtime addon. */
        RuntimeAddon: {
            /** @description The unique identifier of the runtime addon. */
            identifier?: string;
            /** @description The component this addon relates to, i.e. Spark. */
            component?: string;
            /** @description The display name of the addon. */
            display_name?: string;
            /** @description The addon's status. */
            status?: string;
            /**
             * Format: boolean
             * @description Manageable addon.
             */
            manageable?: boolean;
            /**
             * Format: date-time
             * @description When the deployment was created.
             */
            created_at?: string;
            /**
             * Format: int32
             * @description ID of the addon.
             */
            id?: number;
            /** @description Reason of not availability. */
            reason?: string;
        };
        /** Details about an execution's runtime */
        RuntimeDetails: {
            /** @description A short description of the runtime. */
            description?: string;
            /** @description The editor configured for this runtime. */
            editor?: string;
            /** @description The edition of this runtime. */
            edition?: string;
            /** @description The kernel associated with this runtime. */
            kernel?: string;
            /** @description The full version of the runtime. */
            full_version?: string;
        };
        RuntimeRepo: {
            /**
             * The numeric identifier for this runtime repo
             * Format: int32
             */
            id?: number;
            /** The name  of this runtime repo */
            name?: string;
            /** The URL of this runtime repo */
            url?: string;
        };
        /**
         * @default ENABLED
         * @enum {string}
         */
        RuntimeStatus: "ENABLED" | "DISABLED" | "DEPRECATED";
        /** @description Parameters to record a Copilot event. */
        SendCopilotEventRequest: {
            /** @description The ID of the engine. */
            engine_id?: string;
            /**
             * Format: int64
             * @description The ID of the Copilot Application.
             */
            application_id?: number;
            /** One of: ["chat command", "slash command", "magic command", "model selection", "insert code", "replace code"] */
            event_type?: string;
            /** Details associated with an event. For slash commands, this contains the actual command. E.g. "/fix" */
            event_details?: string;
            /** The provider ID string associated with a model. For GA, one of ["bedrock", "bedrock-chat", "cloudera"] */
            model_provider_id?: string;
            /** @description The name of the model. */
            model_name?: string;
            /** For GA, one of ["language", "embeddings"] */
            model_type?: string;
            /**
             * Format: boolean
             * @description For slash or chat commands, indicates whether or not the user chose to include the highlighted code
             *     in the notebook as part of the prompt.
             */
            include_selection?: boolean;
            /**
             * Format: int64
             * @description For slash and magic commands, a word count of the length of the prompt.
             */
            prompt_word_count?: number;
        };
        /** @description The response from sending a Copilot event. */
        SendCopilotEventResponse: Record<string, never>;
        /** Request to set default quota for users */
        SetDefaultQuotaRequest: {
            uuid?: string;
            quota?: components["schemas"]["DefaultQuotaInfo"];
        };
        /** Response after setting default quota for users */
        SetDefaultQuotaResponse: {
            /** Format: boolean */
            success?: boolean;
            message?: string;
        };
        SetDockerCredentialRequest: {
            docker_credential_id?: string;
            runtime_identifier?: string;
        };
        SetDockerCredentialResponse: Record<string, never>;
        /** Request to set default quota for teams */
        SetTeamDefaultQuotaRequest: {
            uuid?: string;
            quota?: components["schemas"]["DefaultQuotaInfo"];
        };
        /** Response after setting default quota for teams */
        SetTeamDefaultQuotaResponse: {
            /** Format: boolean */
            success?: boolean;
            message?: string;
        };
        SetWorkspaceSparkDefaultRequest: {
            workspace_spark_default?: string;
            /** if it should set the var for pushdown or k8s */
            is_pushdown?: string;
        };
        SetWorkspaceSparkDefaultResponse: Record<string, never>;
        /** @description Abbreviated createModelBuild information. */
        ShortCreateModelBuild: {
            /** @description A comment associated with the build. */
            comment?: string;
            /** @description The path to the file to build. */
            file_path?: string;
            /** @description The function name to run when executing the build. */
            function_name?: string;
            /** @description The kernel the model build should use. */
            kernel?: string;
            /** @description The runtime ID the model build should use. */
            runtime_identifier?: string;
            /** @description The runtime addons the model build should use, if using runtimes. */
            runtime_addon_identifiers?: string[];
            /** @description ID of the registered model version. */
            registered_model_version_id?: string;
            /** Root folder to be used for file_path */
            model_root_dir?: string;
            /** Custom build script path */
            build_script_path?: string;
        };
        /** @description Abbreviated createModelDeployment information. */
        ShortCreateModelDeployment: {
            /**
             * Format: double
             * @description Number of vCPU to allocate to the deployment.
             */
            cpu?: number;
            /**
             * Format: double
             * @description Amount of memory in GB to allocate to the deployment.
             */
            memory?: number;
            /**
             * Format: int32
             * @description Number of nvidia GPUs to allocate to the deployment.
             */
            nvidia_gpus?: number;
            /** @description Environment variables to run the deployment with. */
            environment?: {
                [key: string]: string;
            };
            /**
             * Format: int32
             * @description Number of Replications.
             */
            replicas?: number;
            /**
             * @description Write-only secrets for the deployment. Stored as a K8s Opaque Secret
             *     and volume-mounted into the pod at /etc/deployment-secrets/.
             *     NOT returned by GetModelDeployment — collaborators can use but not read these values.
             */
            deployment_secrets?: {
                [key: string]: string;
            };
        };
        /** @description Abbreviated project information. */
        ShortProject: {
            /** Project ID */
            public_identifier?: string;
            /** Name of the Project */
            name?: string;
            /** Default Project Engine type. e.g. "ml_runtime" */
            default_project_engine?: string;
            /** Slug information of the Project */
            slug?: string;
        };
        /** @description Abbreviated user information. */
        ShortUser: {
            /** @description The username. */
            username?: string;
            /** @description The user's full name. */
            name?: string;
            /** @description The user's email address. */
            email?: string;
        };
        /** @description SimpleMetadata is a simple model metadata. */
        SimpleMetadata: {
            /** @description git url for model code. */
            git_url?: string;
            /** @description commit sha for model code. */
            commit_id?: string;
            /** @description metrics for the model. */
            metrics?: components["schemas"]["Metric"][];
            /** @description ExperimentRun parameters. */
            params?: components["schemas"]["Tag"][];
            /** @description Additional metadata key-value pairs. */
            tags?: components["schemas"]["Tag"][];
        };
        SyncedTeamGroup: {
            cn?: string;
            dn?: string;
            /** Format: int64 */
            id?: string;
            /** Format: date-time */
            last_synced_at?: string;
            permission?: string;
            /** Format: int64 */
            team_id?: string;
        };
        /** @description Tag is used to add more metadata regarding an experiment/run. */
        Tag: {
            /** @description The tag key. */
            key?: string;
            /** @description The tag value. */
            value?: string;
        };
        /** Team details */
        Team: {
            /**
             * id of the team
             * Format: int64
             */
            id?: string;
            /** username of the team */
            username?: string;
            /** username_hash of the team */
            username_hash?: string;
            /** type of the team like local/ldap/saml etc */
            type?: string;
            /** email of the team */
            email?: string;
            /** name of the team */
            name?: string;
            /** bio of the team */
            bio?: string;
            /** public_email of the team */
            public_email?: string;
            /**
             * admin flag of the team
             * Format: boolean
             */
            admin?: boolean;
            /**
             * business_user flag of the team
             * Format: boolean
             */
            business_user?: boolean;
            /** github of the team */
            github?: string;
            /**
             * github_pubkey_id of the team
             * Format: int64
             */
            github_pubkey_id?: string;
            /**
             * github_oauth_completed of the team
             * Format: boolean
             */
            github_oauth_completed?: boolean;
            /**
             * last_login_at time of the team
             * Format: date-time
             */
            last_login_at?: string;
            /**
             * joined_on time of the team
             * Format: date-time
             */
            joined_on?: string;
            /**
             * followed of the team
             * Format: boolean
             */
            followed?: boolean;
            /**
             * last_seen_at time of the team
             * Format: date-time
             */
            last_seen_at?: string;
            /** hadoop_username of the team */
            hadoop_username?: string;
            /**
             * last_logout_at_tz time of the team
             * Format: date-time
             */
            last_logout_at_tz?: string;
            /**
             * password_updated_at time of the team
             * Format: date-time
             */
            password_updated_at?: string;
            /**
             * followers of the team
             * Format: int64
             */
            followers?: string;
            /**
             * public_projects of the team
             * Format: int64
             */
            public_projects?: string;
            /**
             * organization_projects of the team
             * Format: int64
             */
            organization_projects?: string;
            /**
             * private_projects of the team
             * Format: int64
             */
            private_projects?: string;
            /**
             * running_dashboards of the team
             * Format: int64
             */
            running_dashboards?: string;
            /**
             * active_vcpus of the team
             * Format: int64
             */
            active_vcpus?: string;
            /**
             * number of members in the team
             * Format: int64
             */
            members?: string;
            /**
             * api_keys of the team
             * Format: int64
             */
            api_keys?: string;
            /**
             * last_context_id of the team
             * Format: int64
             */
            last_context_id?: string;
            /**
             * banned flag of the team
             * Format: boolean
             */
            banned?: boolean;
            /**
             * deactivated flag of the team
             * Format: boolean
             */
            deactivated?: boolean;
            /** namespace of the team */
            namespace?: string;
            /** html_url of the team */
            html_url?: string;
            /** url of the team */
            url?: string;
            /**
             * sessions_run of the team
             * Format: int64
             */
            sessions_run?: string;
            /**
             * jobs_run of the team
             * Format: int64
             */
            jobs_run?: string;
            /**
             * cpu_hours of the team
             * Format: double
             */
            cpu_hours?: number;
            /**
             * gpu_hours of the team
             * Format: double
             */
            gpu_hours?: number;
            /**
             * memory_hours of the team
             * Format: double
             */
            memory_hours?: number;
            /**
             * avg_session_duration of the team
             * Format: double
             */
            avg_session_duration?: number;
            permissions?: components["schemas"]["TeamPermissions"];
            /** account_status of the team */
            account_status?: string;
            /**
             * ldap_synced flag of the team
             * Format: boolean
             */
            ldap_synced?: boolean;
            /**
             * last_synced_at of the team
             * Format: date-time
             */
            last_synced_at?: string;
            /** teamMembers of the team */
            team_members?: components["schemas"]["TeamMember"][];
            /**
             * _inactivity_timeout of the team
             * Format: int32
             */
            inactivity_timeout?: number;
        };
        TeamAcceleratorQuota: {
            /** team id */
            team_id?: string;
            /** team name */
            team_name?: string;
            /** accelerator id */
            accelerator_id?: string;
            quota_usage?: components["schemas"]["Quota"];
            quota_configured?: components["schemas"]["Quota"];
        };
        /** Details of a team member */
        TeamMember: {
            /**
             * id of the team member
             * Format: int32
             */
            id?: number;
            /** username of the the team member */
            username?: string;
            /** name of the team memeber */
            name?: string;
            /** html_url of the team memeber */
            html_url?: string;
            /** url of the team memeber */
            url?: string;
            /** permission of the team memeber */
            permission?: string;
        };
        /** Details of a team member public information */
        TeamMemberPublic: {
            /**
             * id of the team member
             * Format: int64
             */
            id?: string;
            /** username of the the team member */
            username?: string;
            /** name of the team memeber */
            name?: string;
            /** html_url of the team memeber */
            html_url?: string;
            /** url of the team memeber */
            url?: string;
        };
        /** Permissions of given team */
        TeamPermissions: {
            /**
             * Format: boolean
             * @description business_user can access application.
             */
            business_user?: boolean;
            /**
             * Format: boolean
             * @description Read-only, aka Viewer. Can view code, data, and results.
             */
            read?: boolean;
            /**
             * Format: boolean
             * @description operator can start or stop pre-existing jobs.
             */
            operator?: boolean;
            /**
             * Format: boolean
             * @description Read-write, aka Contributor. Can view and modify all project resources.
             */
            write?: boolean;
            /**
             * Format: boolean
             * @description Administrator. Can view and modify all project resources,
             *     add new collaborators, and delete the project.
             */
            admin?: boolean;
            /**
             * owner
             * Format: boolean
             */
            owner?: boolean;
        };
        /** Response object for time series data */
        TimeSeriesResponse: {
            /** @description Type of the time series. */
            series_type?: string;
            result?: components["schemas"]["TimeSeriesResult"];
            /** @description Next page token. */
            next_page_token?: string;
        };
        /** Time series result */
        TimeSeriesResult: {
            /** Result of the time series query */
            values?: components["schemas"]["TimeSeriesResultValues"][];
        };
        /** Time series result values */
        TimeSeriesResultValues: {
            /**
             * timestamp
             * Format: uint64
             */
            time_stamp?: string;
            /**
             * count
             * Format: uint64
             */
            count?: string;
        };
        UpdateAcceleratorBasedTeamQuotaRequest: {
            /** @description The AcceleratorBasedTeamQuota object containing some number of fields to update. */
            accelerator_based_team_quota?: components["schemas"]["AcceleratorBasedTeamQuota"][];
        };
        /** Response for updating team accelerator quotas */
        UpdateAcceleratorBasedTeamQuotaResponse: {
            /**
             * Number of team accelerator quotas updated
             * Format: int32
             */
            rows_affected?: number;
        };
        UpdateAcceleratorBasedUserQuotaRequest: {
            /** @description The AcceleratorBasedUserQuota object containing some number of fields to update. */
            accelerator_based_user_quota?: components["schemas"]["AcceleratorBasedUserQuota"][];
        };
        /** Response for updating node labels with admin_config_max_per_workload */
        UpdateAcceleratorBasedUserQuotaResponse: {
            /**
             * Number of node labels updated with admin_config_max_per_workload
             * Format: int32
             */
            rows_affected?: number;
        };
        /** Request to update CPU profile */
        UpdateCpuProfileRequest: {
            /** Format: int32 */
            id?: number;
            /** Format: int32 */
            resource_group_id?: number;
            /** Format: double */
            cpu?: number;
            /** Format: double */
            memory?: number;
        };
        /** Response to update CPU profile */
        UpdateCpuProfileResponse: {
            /**
             * number of records updated for cpu profile
             * Format: int32
             */
            rows_affected?: number;
        };
        /** Parameters to update the group permission for a synced team */
        UpdateGroupPermissionForSyncedTeamRequest: {
            /** team name */
            team_name?: string;
            /**
             * group id
             * Format: int64
             */
            group_id?: string;
            /** permission */
            permission?: string;
        };
        /** Response to update the group permission for a synced team */
        UpdateGroupPermissionForSyncedTeamResponse: Record<string, never>;
        /** Parameters to update the team member permission for a synced team */
        UpdateMemberPermissionForSyncedTeamRequest: {
            /** team name */
            team_name?: string;
            /**
             * user id
             * Format: int64
             */
            user_id?: string;
            /** permission */
            permission?: string;
        };
        /** Response to update the team member permission for a synced team */
        UpdateMemberPermissionForSyncedTeamResponse: Record<string, never>;
        UpdateNodeLabelAdminConfigRequest: {
            /** map of id and admin_config_max_per_workload in an AcceleratorNodeLabel */
            id_max_gpu_workload?: {
                [key: string]: string;
            };
        };
        /** Response for updating node labels with admin_config_max_per_workload */
        UpdateNodeLabelAdminConfigResponse: {
            /**
             * Number of node labels updated with admin_config_max_per_workload
             * Format: int32
             */
            rows_affected?: number;
        };
        UpdateNodeLabelDefaultQuotaRequest: {
            /** map of id and default_quota in an AcceleratorNodeLabel */
            id_default_quota?: {
                [key: string]: string;
            };
        };
        UpdateNodeLabelDefaultQuotaResponse: {
            /**
             * Number of node labels updated with default_quota
             * Format: int32
             */
            rows_affected?: number;
        };
        /** Request to update gpu profile */
        UpdateNodelLabelGpuProfileRequest: {
            /** Format: int64 */
            resource_group_id?: string;
            /** Format: int64 */
            gpu_count?: string;
            /** Format: int64 */
            id?: string;
            /** Format: double */
            cpu?: number;
            /** Format: double */
            memory?: number;
        };
        /** Response to update gpu profile call */
        UpdateNodelLabelGpuProfileResponse: {
            /**
             * number of records update for gpu profile
             * Format: int32
             */
            rows_affected?: number;
        };
        /** updateRegisteredModelRequest request to update a model's description */
        UpdateRegisteredModelRequest: {
            /** @description Model ID. */
            model_id?: string;
            /** @description Any description for the model. */
            description?: string;
            visibility?: components["schemas"]["Visibility"];
            user_id?: string;
        };
        UpdateRegisteredModelVersionRequest: {
            /** @description Model ID. */
            model_id?: string;
            /** @description Model version ID. */
            model_version_id?: string;
            /** @description Model version description. */
            notes?: string;
            /** @description Model version tags. */
            tags?: components["schemas"]["Tag"][];
        };
        /** @description Parameters to update selected runtime addons. */
        UpdateRuntimeAddonStatusRequest: {
            status?: components["schemas"]["UpdateRuntimeAddonStatusRequestRuntimeAddonStatus"];
            /** @description List of runtime addons to update (not recommended). */
            ids?: number[];
            /** @description List of runtime addons to update. */
            identifiers?: string[];
        };
        /**
         * @default UNKNOWN
         * @enum {string}
         */
        UpdateRuntimeAddonStatusRequestRuntimeAddonStatus: "UNKNOWN" | "AVAILABLE" | "DISABLED" | "DEPRECATED" | "DELETED" | "FAILED";
        /** @description Response for updating runtimes. */
        UpdateRuntimeAddonStatusResponse: {
            /**
             * Number of runtime addons updated
             * Format: int32
             */
            rows_affected?: number;
        };
        /** @description Parameters to update selected runtimes. */
        UpdateRuntimeStatusRequest: {
            status?: components["schemas"]["RuntimeStatus"];
            /** @description List of runtimes to update (not recommended). */
            runtime_id?: number[];
            /** @description List of runtimes to update. */
            image_identifier?: string[];
        };
        /** @description Response for updating runtimes. */
        UpdateRuntimeStatusResponse: {
            /**
             * Number of runtimes updated
             * Format: int32
             */
            rows_affected?: number;
        };
        /** @description Parameters of a single model for the update flow. */
        UpdateSingleModel: {
            /**
             * @description ID of the model.
             *     A model CRN looks like <workspace CRN>/<UUID>. The ID is the UUID portion of the CRN.
             */
            id?: string;
            /** @description The name of the model. */
            name?: string;
            /** @description The description of the model. */
            description?: string;
            /** @description Visibility of the model. */
            visibility?: string;
            default_resources?: components["schemas"]["DefaultResources"];
            default_replication_policy?: components["schemas"]["DefaultReplicationPolicy"];
            /**
             * userID of the service account that should be used to deploy the model
             *     Pass a value <=0 to reset it and to make use of logged in user's ID for future deployments
             * Format: int32
             */
            run_as?: number;
            /**
             * Label to use for node selecting gpu/accelerator
             * Format: int64
             */
            accelerator_label_id?: string;
            /**
             * Format: int32
             * @description The ID of the resource group associated with this job.
             */
            resource_group_id?: number;
            /**
             * Format: int32
             * @description The ID of the resource profile that determines the CPU and memory allocation for this job.
             */
            resource_profile_id?: number;
        };
        /** Response object for each usage */
        UsageResponse: {
            /** Name of the workload */
            name?: string;
            /** The creator details */
            creator?: string;
            /** The name of the group in which the workload runs */
            group?: string;
            /** The project name */
            project_name?: string;
            /**
             * The cpu used by the worklod
             * Format: float
             */
            cpu?: number;
            /**
             * The memory used by the worklod
             * Format: float
             */
            memory?: number;
            /**
             * The nvidia_gpu used by the worklod
             * Format: float
             */
            nvidia_gpu?: number;
            /** The workload type */
            workload_type?: string;
            /**
             * The created time stamp
             * Format: date-time
             */
            created_at?: string;
            /**
             * The durtaion of the worklod
             * Format: int64
             */
            duration?: string;
            /** The workload status */
            status?: string;
            creator_info?: components["schemas"]["UserOrGroupInfo"];
            group_info?: components["schemas"]["UserOrGroupInfo"];
            project_info?: components["schemas"]["ProjectInfo"];
            /** The id of the usage response */
            id?: string;
            /** The workload html_url */
            workload_url?: string;
            /** The message */
            message?: string;
            /**
             * OOM killed
             * Format: boolean
             */
            oom_killed?: boolean;
            k8s_info?: components["schemas"]["K8SInfo"];
        };
        UserAcceleratorQuota: {
            /** userid of user */
            user_id?: string;
            /** username of user */
            username?: string;
            /** accelerator id */
            accelerator_id?: string;
            quota_usage?: components["schemas"]["Quota"];
            quota_configured?: components["schemas"]["Quota"];
        };
        /** User or Group Info */
        UserOrGroupInfo: {
            /**
             * id of the user or group
             * Format: int64
             */
            id?: number;
            /** html_url of the user or group */
            html_url?: string;
            /** url of the user or group */
            url?: string;
            /** name of the user or group */
            name?: string;
            /** username of the user or group */
            user_name?: string;
        };
        UserQuota: {
            user?: components["schemas"]["UserOrGroupInfo"];
            quota_usage?: components["schemas"]["Quota"];
            quota_configured?: components["schemas"]["Quota"];
        };
        /** single entry of V2 key that is stored in the DB */
        V2KeyDetails: {
            /** New key_id */
            key_id?: string;
            /** New created_at */
            created_at?: string;
            /** New expiry_date */
            expiry_date?: string;
            /** New comments */
            comments?: string;
            /** new Audiences */
            audiences?: string[];
        };
        ValidateAPIKeyRequest: {
            audience?: string;
        };
        ValidateAPIKeyResponse: {
            /** Format: boolean */
            valid?: boolean;
            username?: string;
            message?: string;
        };
        ValidateCustomRuntimeResponse: {
            /** Format: boolean */
            success?: boolean;
            reason?: string;
            reason_data?: string;
            details?: components["schemas"]["CustomRuntimeImageDetails"];
        };
        /**
         * @default PRIVATE
         * @enum {string}
         */
        Visibility: "PRIVATE" | "PUBLIC";
        /** Workload details */
        WorkloadDetails: {
            /** The CRN of the workload */
            workload_crn?: string;
            /** The name of the workload */
            workload_name?: string;
            /** The type of workload (session, job, application, model) */
            workload_type?: string;
            /**
             * Unix timestamp of when the workload was created
             * Format: date-time
             */
            create_time?: string;
            /** The crn of the user that created the workload */
            creator_user_crn?: string;
            /** The username of the user that created the workload */
            creator_user_name?: string;
            project?: components["schemas"]["ProjectDetails"];
            /**
             * If the workload was deleted
             * Format: boolean
             */
            deleted?: boolean;
        };
        protobufAny: {
            type_url?: string;
            /** Format: byte */
            value?: string;
        };
        /**
         * `FieldMask` represents a set of symbolic field paths, for example:
         * @description paths: "f.a"
         *         paths: "f.b.d"
         *
         *     Here `f` represents a field in some root message, `a` and `b`
         *     fields in the message found in `f`, and `d` a field found in the
         *     message in `f.b`.
         *
         *     Field masks are used to specify a subset of fields that should be
         *     returned by a get operation or modified by an update operation.
         *     Field masks also have a custom JSON encoding (see below).
         *
         *     # Field Masks in Projections
         *
         *     When used in the context of a projection, a response message or
         *     sub-message is filtered by the API to only contain those fields as
         *     specified in the mask. For example, if the mask in the previous
         *     example is applied to a response message as follows:
         *
         *         f {
         *           a : 22
         *           b {
         *             d : 1
         *             x : 2
         *           }
         *           y : 13
         *         }
         *         z: 8
         *
         *     The result will not contain specific values for fields x,y and z
         *     (their value will be set to the default, and omitted in proto text
         *     output):
         *
         *
         *         f {
         *           a : 22
         *           b {
         *             d : 1
         *           }
         *         }
         *
         *     A repeated field is not allowed except at the last position of a
         *     paths string.
         *
         *     If a FieldMask object is not present in a get operation, the
         *     operation applies to all fields (as if a FieldMask of all fields
         *     had been specified).
         *
         *     Note that a field mask does not necessarily apply to the
         *     top-level response message. In case of a REST get operation, the
         *     field mask applies directly to the response, but in case of a REST
         *     list operation, the mask instead applies to each individual message
         *     in the returned resource list. In case of a REST custom method,
         *     other definitions may be used. Where the mask applies will be
         *     clearly documented together with its declaration in the API.  In
         *     any case, the effect on the returned resource/resources is required
         *     behavior for APIs.
         *
         *     # Field Masks in Update Operations
         *
         *     A field mask in update operations specifies which fields of the
         *     targeted resource are going to be updated. The API is required
         *     to only change the values of the fields as specified in the mask
         *     and leave the others untouched. If a resource is passed in to
         *     describe the updated values, the API ignores the values of all
         *     fields not covered by the mask.
         *
         *     If a repeated field is specified for an update operation, new values will
         *     be appended to the existing repeated field in the target resource. Note that
         *     a repeated field is only allowed in the last position of a `paths` string.
         *
         *     If a sub-message is specified in the last position of the field mask for an
         *     update operation, then new value will be merged into the existing sub-message
         *     in the target resource.
         *
         *     For example, given the target message:
         *
         *         f {
         *           b {
         *             d: 1
         *             x: 2
         *           }
         *           c: [1]
         *         }
         *
         *     And an update message:
         *
         *         f {
         *           b {
         *             d: 10
         *           }
         *           c: [2]
         *         }
         *
         *     then if the field mask is:
         *
         *      paths: ["f.b", "f.c"]
         *
         *     then the result will be:
         *
         *         f {
         *           b {
         *             d: 10
         *             x: 2
         *           }
         *           c: [1, 2]
         *         }
         *
         *     An implementation may provide options to override this default behavior for
         *     repeated and message fields.
         *
         *     In order to reset a field's value to the default, the field must
         *     be in the mask and set to the default value in the provided resource.
         *     Hence, in order to reset all fields of a resource, provide a default
         *     instance of the resource and set all fields in the mask, or do
         *     not provide a mask as described below.
         *
         *     If a field mask is not present on update, the operation applies to
         *     all fields (as if a field mask of all fields has been specified).
         *     Note that in the presence of schema evolution, this may mean that
         *     fields the client does not know and has therefore not filled into
         *     the request will be reset to their default. If this is unwanted
         *     behavior, a specific service may require a client to always specify
         *     a field mask, producing an error if not.
         *
         *     As with get operations, the location of the resource which
         *     describes the updated values in the request message depends on the
         *     operation kind. In any case, the effect of the field mask is
         *     required to be honored by the API.
         *
         *     ## Considerations for HTTP REST
         *
         *     The HTTP kind of an update operation which uses a field mask must
         *     be set to PATCH instead of PUT in order to satisfy HTTP semantics
         *     (PUT must only be used for full updates).
         *
         *     # JSON Encoding of Field Masks
         *
         *     In JSON, a field mask is encoded as a single string where paths are
         *     separated by a comma. Fields name in each path are converted
         *     to/from lower-camel naming conventions.
         *
         *     As an example, consider the following message declarations:
         *
         *         message Profile {
         *           User user = 1;
         *           Photo photo = 2;
         *         }
         *         message User {
         *           string display_name = 1;
         *           string address = 2;
         *         }
         *
         *     In proto a field mask for `Profile` may look as such:
         *
         *         mask {
         *           paths: "user.display_name"
         *           paths: "photo"
         *         }
         *
         *     In JSON, the same mask is represented as below:
         *
         *         {
         *           mask: "user.displayName,photo"
         *         }
         *
         *     # Field Masks and Oneof Fields
         *
         *     Field masks treat fields in oneofs just as regular fields. Consider the
         *     following message:
         *
         *         message SampleMessage {
         *           oneof test_oneof {
         *             string name = 4;
         *             SubMessage sub_message = 9;
         *           }
         *         }
         *
         *     The field mask can be:
         *
         *         mask {
         *           paths: "name"
         *         }
         *
         *     Or:
         *
         *         mask {
         *           paths: "sub_message"
         *         }
         *
         *     Note that oneof type names ("test_oneof" in this case) cannot be used in
         *     paths.
         *
         *     ## Field Mask Verification
         *
         *     The implementation of any API method which has a FieldMask type field in the
         *     request should verify the included field paths, and return an
         *     `INVALID_ARGUMENT` error if any path is unmappable.
         */
        protobufFieldMask: {
            /** @description The set of field mask paths. */
            paths?: string[];
        };
        runtimeError: {
            error?: string;
            /** Format: int32 */
            code?: number;
            message?: string;
            details?: components["schemas"]["protobufAny"][];
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    CreateAmp: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateAmpRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Project"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ValidateAPIKey: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ValidateAPIKeyRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ValidateAPIKeyResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ReadBaseClusterSparkDefault: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReadBaseClusterSparkDefaultResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ReadCMLSparkDefault: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Optional parameter, only relevant for project scope, if pushdown is enabled or not */
                pushdown_enabled: string;
                /** @description The context (workspace level or project level) */
                raz_enabled: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReadCMLSparkDefaultResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    GetCopilotEmbeddingModel: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The Copilot embedding model's ID. */
                copilot_embedding_model_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CopilotEmbeddingModel"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ListCopilotEmbeddingModels: {
        parameters: {
            query?: {
                /**
                 * @description Search filter is an optional HTTP parameter to filter results by.
                 *     Supported search filter keys are:
                 *         [provider name endpoint enabled default provider_id].
                 *     For example:
                 *       search_filter={"provider":"Amazon Bedrock","enabled":"t"}.
                 */
                search_filter?: string;
                /**
                 * @description Sort is an optional HTTP parameter to sort results by.
                 *     Supported sort keys are: [provider name endpoint enabled default].
                 *     where "+" means sort by ascending order, and "-" means sort by descending order.
                 *     For example:
                 *       sort=provider.
                 */
                sort?: string;
                /** @description Page size of the response Copilot embedding model list. */
                page_size?: number;
                /** @description Page token for specifying which page to return. */
                page_token?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListCopilotEmbeddingModelsResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    CreateCopilotEmbeddingModel: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateCopilotEmbeddingModelRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CopilotEmbeddingModel"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    UpdateCopilotEmbeddingModel: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description ID of the model. Must be unique. */
                "copilot_embedding_model.id": string;
            };
            cookie?: never;
        };
        /** @description The embedding model containing some number of fields to update. */
        requestBody: {
            content: {
                "application/json": components["schemas"]["CopilotEmbeddingModel"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CopilotEmbeddingModel"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    DeleteCopilotEmbeddingModel: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                copilot_embedding_model_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DeleteCopilotEmbeddingModelResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    SendCopilotEvent: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SendCopilotEventRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SendCopilotEventResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    GetCopilotModel: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The Copilot model's ID. */
                copilot_model_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CopilotModel"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ListCopilotModels: {
        parameters: {
            query?: {
                /**
                 * @description Search filter is an optional HTTP parameter to filter results by.
                 *     Supported search filter keys are:
                 *         [provider name endpoint enabled default provider_id].
                 *     For example:
                 *       search_filter={"provider":"Amazon Bedrock","enabled":"t"}.
                 */
                search_filter?: string;
                /**
                 * @description Sort is an optional HTTP parameter to sort results by.
                 *     Supported sort keys are: [provider name endpoint enabled default].
                 *     where "+" means sort by ascending order, and "-" means sort by descending order.
                 *     For example:
                 *       sort=provider.
                 */
                sort?: string;
                /** @description Page size of the response Copilot model list. */
                page_size?: number;
                /** @description Page token for specifying which page to return. */
                page_token?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListCopilotModelsResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    CreateCopilotModel: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateCopilotModelRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CopilotModel"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    UpdateCopilotModel: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description ID of the model. Must be unique. */
                "copilot_model.id": string;
            };
            cookie?: never;
        };
        /** @description The model containing some number of fields to update. */
        requestBody: {
            content: {
                "application/json": components["schemas"]["CopilotModel"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CopilotModel"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    DeleteCopilotModel: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                copilot_model_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DeleteCopilotModelResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ListCPUProfiles: {
        parameters: {
            query?: {
                /**
                 * @description Search filter is an optional HTTP parameter to filter results by.
                 *     Supported search filter keys are: [id resource_group_id].
                 */
                search_filter?: string;
                /**
                 * @description Sort is an optional HTTP parameter to sort results by.
                 *     Supported sort keys are: [id cpu memory resource_group_id].
                 */
                sort?: string;
                /** @description Page size of the response cpu profiles list. */
                page_size?: number;
                /** @description Page token for specifying which page to return. */
                page_token?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListCpuProfilesResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    CreateCPUProfile: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateCpuProfileRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CreateCpuProfileResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    DeleteCPUProfile: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DeleteCpuProfileResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    UpdateCPUProfile: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateCpuProfileRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UpdateCpuProfileResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    DashboardsArchive: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                days_finished: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DashboardsArchiveResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    GetDefaultQuotas: {
        parameters: {
            query?: {
                uuid?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GetDefaultQuotasResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    SetTeamDefaultQuota: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SetTeamDefaultQuotaRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SetTeamDefaultQuotaResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    GetDefaultQuota: {
        parameters: {
            query?: {
                uuid?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GetDefaultQuotaResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    SetDefaultQuota: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SetDefaultQuotaRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SetDefaultQuotaResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    GenerateDiagBundle: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DiagBundleGenerateRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DiagBundleStatusResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    GetDiagBundleStatus: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                request_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DiagBundleStatusResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ListDockerCredentials: {
        parameters: {
            query?: {
                /**
                 * @description Search filter is an optional HTTP parameter to filter results by.
                 *     Supported search filter keys are: [id name url].
                 *     For example:
                 *       search_filter={"id":"1","name":"My Repo","url":"my.url"}.
                 */
                search_filter?: string;
                /**
                 * @description Sort is an optional HTTP parameter to sort results by.
                 *     Supported sort keys are: [id name url].
                 *     where "+" means sort by ascending order, and "-" means sort by descending order.
                 *     For example:
                 *       sort=id.
                 */
                sort?: string;
                /** @description page size of the response runtime repo list. */
                page_size?: number;
                /** @description page token for specifying which page to return. */
                page_token?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListDockerCredentialsResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    CreateDockerCredential: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateDockerCredentialRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DockerCredentialPublic"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    UpdateDockerCredential: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                "docker_credential.id": string;
            };
            cookie?: never;
        };
        /** @description The dockercredential object containing some number of fields to update. */
        requestBody: {
            content: {
                "application/json": components["schemas"]["DockerCredentialSensitive"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DockerCredentialPublic"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    DeleteDockerCredential: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description the id of the docker credential to delete */
                docker_credential_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DeleteDockerCredentialResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ListAllExperiments: {
        parameters: {
            query?: {
                /** @description Search filter is an optional HTTP parameter to filter results by. */
                search_filter?: string;
                /**
                 * @description Page size is an optional argument for number of entries to return in one page.
                 *     If not specified, the server will determine a page size.
                 *     If specified, must be respecified for further requests when using the
                 *     provided next page token in the response.
                 */
                page_size?: number;
                /**
                 * @description Page token is an optional argument for specifying which page of results to get.
                 *     If not specified, the first page will be returned, including a token for the next page.
                 *     Will be empty if there is no next page.
                 */
                page_token?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListExperimentsResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ListGroupsQuota: {
        parameters: {
            query?: {
                /**
                 * @description Search filter is an optional HTTP parameter to filter results by.
                 *     Supported search filter keys are: [banned deactivated].
                 *     For example:
                 *       search_filter={"deactivated":"false","banned":"false"}.
                 */
                search_filter?: string;
                /**
                 * @description Sort is an optional HTTP parameter to sort results by.
                 *     Supported sort keys are: [username].
                 *     where "+" means sort by ascending order, and "-" means sort by descending order.
                 *     For example:
                 *       sort=username.
                 */
                sort?: string;
                /** @description page size of the response runtime repo list. */
                page_size?: number;
                /** @description page token for specifying which page to return. */
                page_token?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListGroupsQuotaResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ListAllJobs: {
        parameters: {
            query?: {
                /**
                 * @description Search filter is an optional HTTP parameter to filter results by.
                 *     Supported search filter keys are: [creator.email creator.name creator.username description kernel name paused script type].
                 *     For example:
                 *       search_filter={"name":"foo","creator.name":"bar"},.
                 */
                search_filter?: string;
                /**
                 * @description Page size is an optional argument for number of entries to return in one page.
                 *     If not specified, the server will determine a page size.
                 *     If specified, must be respecified for further requests when using the
                 *     provided next page token in the response.
                 */
                page_size?: number;
                /**
                 * @description Page token is an optional argument for specifying which page of results to get.
                 *     If not specified, the first page will be returned, including a token for the next page.
                 *     Will be empty if there is no next page.
                 */
                page_token?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListJobsResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ListMlServingApps: {
        parameters: {
            query?: {
                /** @description Additional query options. */
                query_options?: string[];
                /** @description Force a new ListMlServingApps call to the Control Plane, and refresh the cache. Should be set to false unless manually triggered by an admin. */
                force_refresh?: boolean;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListMlServingAppsResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ListAllModels: {
        parameters: {
            query?: {
                search_filter?: string;
                page_size?: number;
                page_token?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListModelsResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ListNewsFeeds: {
        parameters: {
            query?: {
                page_size?: number;
                page_token?: string;
            };
            header?: never;
            path: {
                category: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListNewsFeedsResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ListAllAcceleratorNodeLabels: {
        parameters: {
            query?: {
                /**
                 * @description Search filter is an optional HTTP parameter to filter results by.
                 *     Supported search filter keys are: [id label_key resource_group_id].
                 */
                search_filter?: string;
                /**
                 * @description Sort is an optional HTTP parameter to sort results by.
                 *     Supported sort keys are: [id label_key].
                 *       sort=id.
                 */
                sort?: string;
                /** @description page size of the response accelerator node labels list. */
                page_size?: number;
                /** @description page token for specifying which page to return. */
                page_token?: string;
                /** @description set the below to true to display all GPUs, even those which are inactive. */
                display_all?: boolean;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListAllAcceleratorsNodeLabelsResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    UpdateAcceleratorLabelsAdminConfig: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateNodeLabelAdminConfigRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UpdateNodeLabelAdminConfigResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    UpdateAcceleratorLabelsDefaultQuota: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateNodeLabelDefaultQuotaRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UpdateNodeLabelDefaultQuotaResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ListAcceleratorBasedUserQuota: {
        parameters: {
            query?: {
                /**
                 * @description Search filter is an optional HTTP parameter to filter results by.
                 *     Supported search filter keys are: [user_id accelerator_id].
                 */
                search_filter?: string;
                /**
                 * @description Sort is an optional HTTP parameter to sort results by.
                 *     Supported sort keys are: [user_id accelerator_id].
                 *       sort=id.
                 */
                sort?: string;
                /** @description page size of the response accelerator based user quota. */
                page_size?: number;
                /** @description page token for specifying which page to return. */
                page_token?: string;
                /** @description set the below to true to display all GPUs, even those which do not have quota set. */
                display_all?: boolean;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListAcceleratorBasedUserQuotaResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    UpdateAcceleratorBasedUserQuota: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateAcceleratorBasedUserQuotaRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UpdateAcceleratorBasedUserQuotaResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ListAcceleratorBasedTeamQuota: {
        parameters: {
            query?: {
                /**
                 * @description Search filter is an optional HTTP parameter to filter results by.
                 *     Supported search filter keys are: [team_id accelerator_id].
                 */
                search_filter?: string;
                /**
                 * @description Sort is an optional HTTP parameter to sort results by.
                 *     Supported sort keys are: [team_id accelerator_id].
                 *       sort=id.
                 */
                sort?: string;
                /** @description page size of the response accelerator based team quota. */
                page_size?: number;
                /** @description page token for specifying which page to return. */
                page_token?: string;
                /** @description set the below to true to display all GPUs, even those which do not have quota set. */
                display_all?: boolean;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListAcceleratorBasedTeamQuotaResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    UpdateAcceleratorBasedTeamQuota: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateAcceleratorBasedTeamQuotaRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UpdateAcceleratorBasedTeamQuotaResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    CreateAcceleratorNodeLabelGpuProfile: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                resource_group_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateNodelLabelGpuProfileRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CreateNodelLabelGpuProfileResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    DeleteAcceleratorNodeLabelGpuProfile: {
        parameters: {
            query?: {
                id?: string;
            };
            header?: never;
            path: {
                resource_group_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DeleteNodelLabelGpuProfileResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    UpdateAcceleratorNodeLabelGpuProfile: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                resource_group_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateNodelLabelGpuProfileRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UpdateNodelLabelGpuProfileResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ListProjectNames: {
        parameters: {
            query?: {
                /**
                 * @description Search filter is an optional HTTP parameter to filter results by.
                 *     Supported search filter keys are: [name].
                 *     For example:
                 *       search_filter={"name":"project name"}.
                 */
                search_filter?: string;
                /**
                 * @description Sort is an optional HTTP parameter to sort results by.
                 *     Supported sort keys are: [name].
                 *     where "+" means sort by ascending order, and "-" means sort by descending order.
                 *     For example:
                 *     	sort=name.
                 */
                sort?: string;
                /** @description page size of the response runtime repo list. */
                page_size?: number;
                /** @description page token for specifying which page to return. */
                page_token?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListProjectNamesResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ListProjects: {
        parameters: {
            query?: {
                /**
                 * @description Search filter is an optional HTTP parameter to filter results by.
                 *     Supported search filter keys are: [creator.email creator.name creator.username description name owner.email owner.name owner.username].
                 *     For example:
                 *       search_filter={"name":"foo","creator.name":"bar"},.
                 */
                search_filter?: string;
                /**
                 * @description Sort is an optional HTTP parameter to sort results by.
                 *     Supported sort keys are: [created_at creator.email creator.name creator.username description name owner.email owner.name owner.username updated_at].
                 *     where "+" means sort by ascending order, and "-" means sort by descending order.
                 *     For example:
                 *       sort=-updated_at,+name.
                 */
                sort?: string;
                /**
                 * @description Page size is an optional argument for number of entries to return in one page.
                 *     If not specified, the server will determine a page size.
                 *     If specified, must be respecified for further requests when using the
                 *     provided next page token in the response.
                 */
                page_size?: number;
                /**
                 * @description Page token is an optional argument for specifying which page of results to get.
                 *     If not specified, the first page will be returned, including a token for the next page.
                 *     Will be empty if there is no next page.
                 */
                page_token?: string;
                /**
                 * @description Default is false. If include_public_projects is set to true, then it will return
                 *     all projects user has access to, including public projects.
                 */
                include_public_projects?: boolean;
                /**
                 * @description Default is false. If include_all_projects is set to true, then it will return
                 *     all projects in the workspace if user is a site admin. If user is not a site admin,
                 *     then it will be equivalent to making use of flag include_public_projects and will return
                 *     all projects user has access to, including public projects.
                 */
                include_all_projects?: boolean;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListProjectsResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    CreateProject: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateProjectRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Project"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    BatchListProjects: {
        parameters: {
            query?: {
                /** @description The list of project IDs to return projects for. */
                project_ids?: string[];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BatchListProjectsResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    UpdateExperiment: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Project ID */
                "experiment.project_id": string;
                /** @description Unique identifier for the experiment. */
                "experiment.id": string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["Experiment"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Experiment"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    UpdateProject: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /**
                 * @description An opaque public identifier for the project.
                 *     Output only.
                 */
                "project.id": string;
            };
            cookie?: never;
        };
        /** @description The project object containing some number of fields to update. */
        requestBody: {
            content: {
                "application/json": components["schemas"]["Project"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Project"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    GetProject: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /**
                 * @description Identifier for a project, in the form of a 19 digit string.
                 *     Example: a1b2-c3d4-e5f6-g7h8
                 */
                project_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Project"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    DeleteProject: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The project's identifier */
                project_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DeleteProjectResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ListApplications: {
        parameters: {
            query?: {
                /**
                 * @description Search filter is an optional HTTP parameter to filter results by.
                 *     Supported search filter keys are: [bypass_authentication creator.email creator.name creator.username description kernel name script status subdomain]
                 *     where "status" can be one of the following: [running, stopping, stopped, starting, failed]
                 *     For example:
                 *       search_filter = {"status":"running"}.
                 */
                search_filter?: string;
                /**
                 * @description Sort is an optional HTTP parameter to sort results by.
                 *     Supported sort keys are: [created_at creator.email creator.name creator.username description kernel name script status updated_at].
                 *     where "+" means sort by ascending order, and "-" means sort by descending order.
                 *     For example:
                 *       sort=-updated_at,name.
                 */
                sort?: string;
                /**
                 * @description Page size is an optional argument for number of entries to return in one page.
                 *     If not specified, the server will determine a page size.
                 *     If specified, must be respecified for further requests when using the
                 *     provided next page token in the response.
                 */
                page_size?: number;
                /**
                 * @description Page token is an optional argument for specifying which page of results to get.
                 *     If not specified, the first page will be returned, including a token for the next page.
                 *     Will be empty if there is no next page.
                 */
                page_token?: string;
            };
            header?: never;
            path: {
                /** @description The project's identifier */
                project_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListApplicationsResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    CreateApplication: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The project's identifier */
                project_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateApplicationRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Application"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    UpdateApplication: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The public project identifier */
                project_id: string;
                /** @description public identifier of the application. */
                "application.id": string;
            };
            cookie?: never;
        };
        /** @description The application containing some number of fields to update. */
        requestBody: {
            content: {
                "application/json": components["schemas"]["Application"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Application"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    GetApplication: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The public project identifier */
                project_id: string;
                /** @description The public application identifier */
                application_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Application"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    DeleteApplication: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The public project identifier */
                project_id: string;
                /** @description The public application identifier */
                application_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DeleteApplicationResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    RestartApplication: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The public project identifier */
                project_id: string;
                /** @description The public application identifier */
                application_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Application"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    StopApplication: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The public project identifier */
                project_id: string;
                /** @description The public application identifier */
                application_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Application"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ListProjectCollaborators: {
        parameters: {
            query?: {
                /**
                 * @description Search filter is an optional HTTP parameter to filter results by.
                 *     Supported search filter keys are: [username, permission].
                 *     For example:
                 *       search_filter={"username":"foo", "permission": "read"},.
                 */
                search_filter?: string;
                /**
                 * @description Sort is an optional HTTP parameter to sort results by.
                 *     Supported sort keys are: [username, permission].
                 *     where "+" means sort by ascending order, and "-" means sort by descending order.
                 *     For example:
                 *       sort=-username,+permission.
                 */
                sort?: string;
                /**
                 * @description Page size is an optional argument for number of entries to return in one page.
                 *     If not specified, the server will determine a page size.
                 *     If specified, must be respecified for further requests when using the
                 *     provided next page token in the response.
                 */
                page_size?: number;
                /**
                 * @description Page token is an optional argument for specifying which page of results to get.
                 *     If not specified, the first page will be returned, including a token for the next page.
                 *     Will be empty if there is no next page.
                 */
                page_token?: string;
            };
            header?: never;
            path: {
                /** @description The identifier of the project. */
                project_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListProjectCollaboratorsResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    AddProjectCollaborator: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The identifier of the project. */
                project_id: string;
                /** @description The username of the collaborator to add. */
                username: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AddProjectCollaboratorRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AddProjectCollaboratorResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    DeleteProjectCollaborator: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The identifier of the project. */
                project_id: string;
                /** @description The username of the collaborator to add. */
                username: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DeleteProjectCollaboratorResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ListExperiments: {
        parameters: {
            query?: {
                /** @description Search filter is an optional HTTP parameter to filter results by. */
                search_filter?: string;
                /**
                 * @description Page size is an optional argument for number of entries to return in one page.
                 *     If not specified, the server will determine a page size.
                 *     If specified, must be respecified for further requests when using the
                 *     provided next page token in the response.
                 */
                page_size?: number;
                /**
                 * @description Page token is an optional argument for specifying which page of results to get.
                 *     If not specified, the first page will be returned, including a token for the next page.
                 *     Will be empty if there is no next page.
                 */
                page_token?: string;
                /** @description Sort is an optional HTTP parameter to sort results by. */
                sort?: string;
            };
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListExperimentsResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    CreateExperiment: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateExperimentRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Experiment"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    GetExperiment: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
                /** @description ID of the associated experiment. */
                experiment_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Experiment"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    DeleteExperiment: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
                experiment_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DeleteExperimentResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ListExperimentRuns: {
        parameters: {
            query?: {
                /**
                 * @description Search filter is an optional HTTP parameter to filter results by.
                 *     Supported search filter keys are: [creator.email creator.name creator.username name status].
                 *     Dynamic search key words are supported for experiment runs.
                 *     Supported fields are [metrics tags params].
                 */
                search_filter?: string;
                /**
                 * @description Page size is an optional argument for number of entries to return in one page.
                 *     If not specified, the server will determine a page size.
                 *     If specified, must be respecified for further requests when using the
                 *     provided next page token in the response.
                 */
                page_size?: number;
                /**
                 * @description Page token is an optional argument for specifying which page of results to get.
                 *     If not specified, the first page will be returned, including a token for the next page.
                 *     Will be empty if there is no next page.
                 */
                page_token?: string;
                /**
                 * @description Sort is an optional HTTP parameter to sort results by.
                 *     Supported sort keys are:
                 *     [created_at creator.email creator.name creator.username name start_time].
                 *     It also supports dynamic sort for metrics, tags and params.
                 *     "+" means sort by ascending order, and "-" means sort by descending order.
                 */
                sort?: string;
            };
            header?: never;
            path: {
                /** @description The project to list experiment runs in. */
                project_id: string;
                /** @description Experiment ID to search over. */
                experiment_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListExperimentRunsResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    CreateExperimentRun: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
                /** @description ID of the associated experiment. */
                experiment_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateExperimentRunRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ExperimentRun"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    UpdateExperimentRun: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The project where the experiment run lives */
                project_id: string;
                /** @description ID of the associated experiment. */
                experiment_id: string;
                /** @description Unique identifier for the ExperimentRun. */
                "run.id": string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ExperimentRun"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ExperimentRun"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    GetExperimentRun: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
                /** @description ID of the associated experiment. */
                experiment_id: string;
                /** @description ID of the ExperimentRun to fetch. Must be provided. */
                run_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ExperimentRun"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    DeleteExperimentRun: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The project the experiment run lives in. */
                project_id: string;
                /** @description The experiment the run is a part of. */
                experiment_id: string;
                /** @description The ID of the run to delete. */
                run_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DeleteExperimentRunResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    GetExperimentRunMetrics: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Project ID */
                project_id: string;
                /** @description Experiment ID the run belongs to */
                experiment_id: string;
                /** @description ID of the ExperimentRun */
                run_id: string;
                /** @description metric key name. */
                metric_key: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GetExperimentRunMetricsResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    DeleteExperimentRunBatch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
                experiment_id: string;
                /** @description ID of the ExperimentRun to log under */
                run_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DeleteExperimentRunBatchRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DeleteExperimentRunBatchResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    LogExperimentRunBatch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
                experiment_id: string;
                /** @description ID of the ExperimentRun to log under */
                run_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LogExperimentRunBatchRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LogExperimentRunBatchResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ListProjectFiles: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The identifier of the project that contains the files to list. */
                project_id: string;
                /** @description Path to list, relative to project root (/home/cdsw) */
                path: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListProjectFilesResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    DeleteProjectFile: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The identifier of the project that contains the file or directory. */
                project_id: string;
                /** @description The path to the file or directory to delete. */
                path: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DeleteProjectFileResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    UpdateProjectFileMetadata: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The identifier of the project that contains the file or directory. */
                project_id: string;
                /** @description The path to the file to update, relative to /home/cdsw */
                path: string;
            };
            cookie?: never;
        };
        /** @description The FileInfo object representing the updated metadata for the file. */
        requestBody: {
            content: {
                "application/json": components["schemas"]["FileInfo"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FileInfo"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ListJobs: {
        parameters: {
            query?: {
                /**
                 * @description Search filter is an optional HTTP parameter to filter results by.
                 *     Supported search filter keys are: [creator.email creator.name creator.username description kernel name paused script type].
                 *     For example:
                 *       search_filter={"name":"foo","creator.name":"bar"},.
                 */
                search_filter?: string;
                /**
                 * @description Sort is an optional HTTP parameter to sort results by.
                 *     Supported sort keys are: [created_at creator.email creator.name creator.username description kernel name paused script type updated_at],
                 *     where "+" means sort by ascending order, and "-" means sort by descending order.
                 *     For example:
                 *       sort=+name,-created_at.
                 */
                sort?: string;
                /**
                 * @description Page size is an optional argument for number of entries to return in one page.
                 *     If not specified, the server will determine a page size.
                 *     If specified, must be respecified for further requests when using the
                 *     provided next page token in the response.
                 */
                page_size?: number;
                /**
                 * @description Page token is an optional argument for specifying which page of results to get.
                 *     If not specified, the first page will be returned, including a token for the next page.
                 *     Will be empty if there is no next page.
                 */
                page_token?: string;
            };
            header?: never;
            path: {
                /** @description The project's identifier */
                project_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListJobsResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    CreateJob: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description ID of the project containing the job. */
                project_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateJobRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Job"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    UpdateJob: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The project containing the job. */
                project_id: string;
                /**
                 * @description Public identifier of the job.
                 *     Output only.
                 */
                "job.id": string;
            };
            cookie?: never;
        };
        /** @description The job containing some number of fields to update. */
        requestBody: {
            content: {
                "application/json": components["schemas"]["Job"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Job"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    GetJob: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The public project identifier */
                project_id: string;
                /** @description The public job identifier */
                job_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Job"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    DeleteJob: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description the public project identifier */
                project_id: string;
                /** @description The public job identifier */
                job_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DeleteJobResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ListJobRuns: {
        parameters: {
            query?: {
                /**
                 * @description Search filter is an optional HTTP parameter to filter results by.
                 *     Supported search filter keys are: [creator.email creator.name creator.username description kernel name paused script type],
                 *     where "status" can be one of the following: [scheduling, running, stopping, stopped, succeeded, failed, timedout]
                 *     For example:
                 *       search_filter={"status":"running","id": "1"}.
                 */
                search_filter?: string;
                /**
                 * @description Sort is an optional HTTP parameter to sort results by.
                 *     Supported sort keys are: [created_at creator.email creator.name creator.username description kernel name paused script type updated_at]"
                 *     where "+" means sort by ascending order, and "-" means sort by descending order.
                 *     For example:
                 *       sort=-updated_at,+name.
                 */
                sort?: string;
                /**
                 * @description Page size is an optional argument for number of entries to return in one page.
                 *     If not specified, the server will determine a page size.
                 *     If specified, must be respecified for further requests when using the
                 *     provided next page token in the response.
                 */
                page_size?: number;
                /**
                 * @description Page token is an optional argument for specifying which page of results to get.
                 *     If not specified, the first page will be returned, including a token for the next page.
                 *     Will be empty if there is no next page.
                 */
                page_token?: string;
            };
            header?: never;
            path: {
                /** @description ID of the project containing the job. */
                project_id: string;
                /** @description ID of the job containing the job runs. */
                job_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListJobRunsResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    CreateJobRun: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description ID of the project containing the job. */
                project_id: string;
                /** @description The job ID to create a new job run for. */
                job_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateJobRunRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["JobRun"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    GetJobRun: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description ID of the project containing the job. */
                project_id: string;
                /** @description ID of the job containing the job run. */
                job_id: string;
                /** @description ID of the job run to get. */
                run_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["JobRun"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    StopJobRun: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description ID of the project containing the job */
                project_id: string;
                /** @description ID of the job containing the job run. */
                job_id: string;
                /** @description ID of the job run to delete. */
                run_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["JobRun"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ListAllRunAsMachineUserCollaborators: {
        parameters: {
            query?: {
                /** @description Search filter is an optional HTTP parameter to filter results by. */
                search_filter?: string;
                /** @description page size of the response model build list. */
                page_size?: number;
                /** @description page token for specifying which page to return. */
                page_token?: string;
                /**
                 * @description Sort is an optional HTTP parameter to sort results by.
                 *     Supported sort keys are: [].
                 *     where "+" means sort by ascending order, and "-" means sort by descending order.
                 *     For example:
                 *       sort=.
                 */
                sort?: string;
            };
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListAllRunAsMachineUserCollaboratorsResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ListModels: {
        parameters: {
            query?: {
                /**
                 * @description Search filter is an optional HTTP parameter to filter results by.
                 *     Supported search filter keys are: [auth_enabled creator.email creator.name creator.username description name].
                 *     For example:
                 *       search_filter={"name":"foo","auth_enabled":"f"}.
                 */
                search_filter?: string;
                /**
                 * @description Sort is an optional HTTP parameter to sort results by.
                 *     Supported sort keys are: [auth_enabled created_at creator.email creator.name creator.username description name updated_at].
                 *     where "+" means sort by ascending order, and "-" means sort by descending order.
                 *     For example:
                 *       sort=created_at.
                 */
                sort?: string;
                /** @description page size of the response model build list. */
                page_size?: number;
                /** @description page token for specifying which page to return. */
                page_token?: string;
            };
            header?: never;
            path: {
                /** @description The project to list models under. */
                project_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListModelsResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    CreateModel: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description ID of the project containing the model. */
                project_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateModelRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Model"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    UpdateModel: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description ID of the project containing the model. */
                project_id: string;
                /**
                 * @description ID of the model.
                 *     A model CRN looks like <workspace CRN>/<UUID>. The ID is the UUID portion of the CRN.
                 */
                "model.id": string;
            };
            cookie?: never;
        };
        /** @description The model containing some number of fields to update. */
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateSingleModel"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Model"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    GetModel: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The project this model belongs to. */
                project_id: string;
                /** @description The model's ID */
                model_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Model"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    DeleteModel: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description ID of the project containing the model. */
                project_id: string;
                /** @description ID of the model to delete. */
                model_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DeleteModelResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ListModelBuilds: {
        parameters: {
            query?: {
                /**
                 * @description Search filter is an optional HTTP parameter to filter results by.
                 *     Supported search filter keys are: [comment creator.email creator.name creator.username crn status],
                 *     where "status" can be one of [pending, succeeded, built, build failed, timedout, pushing, queued, unknown]
                 *     For example:
                 *       search_filter={"comment":"foo","status":"pending"}.
                 */
                search_filter?: string;
                /**
                 * @description Sort is an optional HTTP parameter to sort results by.
                 *     Supported sort keys are: [built_at comment created_at creator.email creator.name creator.username crn status updated_at].
                 *     where "+" means sort by ascending order, and "-" means sort by descending order.
                 *     For example:
                 *       sort=creator.email.
                 */
                sort?: string;
                /** @description page size of the response model build list. */
                page_size?: number;
                /** @description page token for specifying which page to return. */
                page_token?: string;
            };
            header?: never;
            path: {
                /** @description ID of the project containing the model. */
                project_id: string;
                /** @description ID of the model to get builds for. */
                model_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListModelBuildsResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    CreateModelBuild: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description ID of the project containing the model build. */
                project_id: string;
                /** @description The ID of the model that will the build. */
                model_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateModelBuildRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ModelBuild"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    GetModelBuild: {
        parameters: {
            query?: {
                /** @description ID of the registered model version. */
                registered_model_version_id?: string;
            };
            header?: never;
            path: {
                /** @description ID of the project containing the model. */
                project_id: string;
                /** @description ID of the model containing the build. */
                model_id: string;
                /** @description ID of the model build to get. */
                build_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ModelBuild"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    DeleteModelBuild: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description ID of the project containing the model. */
                project_id: string;
                /** @description ID of the model containing the build. */
                model_id: string;
                /** @description ID of the build to delete. */
                build_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DeleteModelBuildResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ListModelDeployments: {
        parameters: {
            query?: {
                /** @description Search filter is an optional HTTP parameter to filter results by. */
                search_filter?: string;
                /** @description page size of the response model build list. */
                page_size?: number;
                /** @description page token for specifying which page to return. */
                page_token?: string;
                /**
                 * @description Sort is an optional HTTP parameter to sort results by.
                 *     Supported sort keys are: [].
                 *     where "+" means sort by ascending order, and "-" means sort by descending order.
                 *     For example:
                 *       sort=.
                 */
                sort?: string;
            };
            header?: never;
            path: {
                /** @description ID of the project containing the model. */
                project_id: string;
                /** @description ID of the model to get deployments for. */
                model_id: string;
                /** @description ID of the model build to get deployments for. */
                build_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListModelDeploymentsResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    CreateModelDeployment: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description ID of the project containing the model. */
                project_id: string;
                /** @description ID of the model to deploy. */
                model_id: string;
                /** @description ID of the model build to deploy. */
                build_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateModelDeploymentRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ModelDeployment"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    GetModelDeployment: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description ID of the project containing the model. */
                project_id: string;
                /** @description ID of the model containing the deployment. */
                model_id: string;
                /** @description ID of the model build containing the deployment. */
                build_id: string;
                /** @description ID of the model deployment to get. */
                deployment_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ModelDeployment"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    RestartModelDeployment: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description ID of the project containing the model. */
                project_id: string;
                /** @description ID of the model containing the deployment. */
                model_id: string;
                /** @description ID of the build containing the deployment. */
                build_id: string;
                /** @description ID of the deployment to restart. */
                deployment_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ModelDeployment"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    StopModelDeployment: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description ID of the project containing the model. */
                project_id: string;
                /** @description ID of the model containing the deployment. */
                model_id: string;
                /** @description ID of the build containing the deployment. */
                build_id: string;
                /** @description ID of the deployment to stop. */
                deployment_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ModelDeployment"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ListRegisteredModels: {
        parameters: {
            query?: {
                /**
                 * @description Search filter is an optional HTTP parameter to filter results by.
                 *     Supported search_filter = {"model_name": "model_name"}
                 *      search_filter = {"creator_id": "<sso name or user name>"}.
                 */
                search_filter?: string;
                /**
                 * @description Sort is an optional HTTP parameter to sort results by.
                 *     Supported sort keys are: [created_at creator.email creator.name creator.username description kernel name script status updated_at].
                 *     where "+" means sort by ascending order, and "-" means sort by descending order.
                 *     For example:
                 *       sort=-created_at.
                 */
                sort?: string;
                /**
                 * @description Page size is an optional argument for number of entries to return in one page.
                 *     If not specified, the server will determine a page size.
                 *     If specified, must be respecified for further requests when using the
                 *     provided next page token in the response.
                 */
                page_size?: number;
                /**
                 * @description Page token is an optional argument for specifying which page of results to get.
                 *     If not specified, the first page will be returned, including a token for the next page.
                 *     Will be empty if there is no next page.
                 */
                page_token?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListRegisteredModelsResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    CreateRegisteredModel: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateRegisteredModelRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RegisteredModel"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    UpdateRegisteredModel: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateRegisteredModelRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RegisteredModel"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    GetRegisteredModel: {
        parameters: {
            query?: {
                /**
                 * @description Search filter is an optional HTTP parameter to filter results by.
                 *     Supported search filters:
                 *     earch_filter = {"version_number":"3"}
                 *     search_filter = {"creator_id":"<sso name or user name>"} example: csso_mlengineer.
                 */
                search_filter?: string;
                /**
                 * @description Sort is an optional HTTP parameter to sort results by.
                 *     Supported sort keys are: [created_at creator.email creator.name creator.username description kernel name script status updated_at].
                 *     where "+" means sort by ascending order, and "-" means sort by descending order.
                 *     :
                 *     supported sort=-created_at
                 *     supported sort=-versions.
                 */
                sort?: string;
                /**
                 * @description Page size is an optional argument for number of entries to return in one page.
                 *     If not specified, the server will determine a page size.
                 *     If specified, must be respecified for further requests when using the
                 *     provided next page token in the response.
                 */
                page_size?: number;
                /**
                 * @description Page token is an optional argument for specifying which page of results to get.
                 *     If not specified, the first page will be returned, including a token for the next page.
                 *     Will be empty if there is no next page.
                 */
                page_token?: string;
            };
            header?: never;
            path: {
                /** @description Model ID. */
                model_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RegisteredModel"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    DeleteRegisteredModel: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Model ID. */
                model_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DeleteRegisteredModelResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    UpdateRegisteredModelVersion: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Model ID. */
                model_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateRegisteredModelVersionRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RegisteredModelVersion"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    GetRegisteredModelVersion: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Model ID. */
                model_id: string;
                /** @description Model version ID. */
                version_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RegisteredModelVersion"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    DeleteRegisteredModelVersion: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Model ID. */
                model_id: string;
                /** @description Model version ID. */
                version_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DeleteRegisteredModelVersionResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    UpdateResourceGroup: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ResourceGroupUpdateFields"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ResourceGroup"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ListAllResourceGroups: {
        parameters: {
            query?: {
                /**
                 * @description Search filter is an optional HTTP parameter to filter results by.
                 *     Example:
                 *     {
                 *     		"gpu_count"	: "isnull:true" -- For CPU Only Resource Groups
                 *     		"gpu_count"	: "gt:0" 		-- For GPU Only Resource Groups
                 *     		"allow_jobs": "eq:true" 	-- For Jobs Allowed Resource Groups
                 *     }.
                 */
                search_filter?: string;
                /**
                 * @description Sort is an optional HTTP parameter to sort results by.
                 *     Supported sort keys are: [id name instance_type].
                 *       sort=id.
                 */
                sort?: string;
                /** @description page size of the response resource group list. */
                page_size?: number;
                /** @description page token for specifying which page to return. */
                page_token?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListAllResourceGroupsResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ListRuntimeAddons: {
        parameters: {
            query?: {
                /**
                 * @description Search filter is an optional HTTP parameter to filter results by.
                 *     Supported search filter keys are: ["identifier", "component", "display_name", "status"].
                 *     For example:
                 *       search_filter = {"component": "Spark", "status": "AVAILABLE"},.
                 */
                search_filter?: string;
                /**
                 * @description Page size is an optional argument for number of entries to return in one page.
                 *     If not specified, the server will determine a page size.
                 *     If specified, must be respecified for further requests when using the
                 *     provided next page token in the response.
                 */
                page_size?: number;
                /**
                 * @description Page token is an optional argument for specifying which page of results to get.
                 *     If not specified, the first page will be returned, including a token for the next page.
                 *     Will be empty if there is no next page.
                 */
                page_token?: string;
                /** @description Sort is an optional HTTP parameter to sort results by. */
                sort?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListRuntimeAddonsResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    LoadRuntimeAddonsUpload: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /**
                     * Format: binary
                     * @description repo-assembly.json payload (application/json) containing runtime_addons.
                     */
                    file: string;
                };
            };
        };
        responses: {
            /** @description Request accepted; returns per-addon submission results. */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description An unexpected error response. */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    UpdateRuntimeAddonStatus: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateRuntimeAddonStatusRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UpdateRuntimeAddonStatusResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ListRuntimeRepos: {
        parameters: {
            query?: {
                /**
                 * @description Search filter is an optional HTTP parameter to filter results by.
                 *     Supported search filter keys are: [id name url].
                 *     For example:
                 *       search_filter={"id":"1","name":"My Repo","url":"my.url"}.
                 */
                search_filter?: string;
                /**
                 * @description Sort is an optional HTTP parameter to sort results by.
                 *     Supported sort keys are: [id name url].
                 *     where "+" means sort by ascending order, and "-" means sort by descending order.
                 *     For example:
                 *       sort=id.
                 */
                sort?: string;
                /** @description page size of the response runtime repo list. */
                page_size?: number;
                /** @description page token for specifying which page to return. */
                page_token?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListRuntimeReposResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    CreateRuntimeRepo: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateRuntimeRepoRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RuntimeRepo"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    DeleteRuntimeRepo: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description the id of the Runtime Repo to delete */
                runtime_repo_id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DeleteRuntimeRepoResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    UpdateRuntimeRepo: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The numeric identifier for this runtime repo */
                "runtimerepo.id": number;
            };
            cookie?: never;
        };
        /** @description The runtimerepo object containing some number of fields to update. */
        requestBody: {
            content: {
                "application/json": components["schemas"]["RuntimeRepo"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RuntimeRepo"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ListRuntimes: {
        parameters: {
            query?: {
                /**
                 * @description Search filter is an optional HTTP parameter to filter results by.
                 *     Supported search filter keys are: ["image_identifier", "editor", "kernel", "edition", "description", "full_version"].
                 *     For example:
                 *       search_filter = {"kernel":"Python 3.7","editor":"JupyterLab"},.
                 */
                search_filter?: string;
                /**
                 * @description Page size is an optional argument for number of entries to return in one page.
                 *     If not specified, the server will determine a page size.
                 *     If specified, must be respecified for further requests when using the
                 *     provided next page token in the response.
                 */
                page_size?: number;
                /**
                 * @description Page token is an optional argument for specifying which page of results to get.
                 *     If not specified, the first page will be returned, including a token for the next page.
                 *     Will be empty if there is no next page.
                 */
                page_token?: string;
                /**
                 * @description Sort is an optional HTTP parameter to sort results by.
                 *     Supported sort keys are: [image_identifier, editor, kernel, edition, description, full_version].
                 *     where "+" means sort by ascending order, and "-" means sort by descending order.
                 *     For example:
                 *       sort=-kernel,+editor.
                 */
                sort?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListRuntimesResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    RegisterCustomRuntime: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RegisterCustomRuntimeRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RegisterCustomRuntimeResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    SetDockerCredential: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SetDockerCredentialRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SetDockerCredentialResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    UpdateRuntimeStatus: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateRuntimeStatusRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UpdateRuntimeStatusResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ValidateCustomRuntime: {
        parameters: {
            query?: {
                url?: string;
                docker_credential_id?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ValidateCustomRuntimeResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    DisableEngines: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DisableEnginesRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DisableEnginesResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    CreateSyncedTeam: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateSyncedTeamRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Team"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    CreateTeam: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateTeamRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Team"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    LatestSyncStatus: {
        parameters: {
            query?: {
                request_id?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LatestSyncStatusResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    TeamsSyncStatus: {
        parameters: {
            query?: {
                request_id?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LatestSyncStatusResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    UsersSyncStatus: {
        parameters: {
            query?: {
                request_id?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LatestSyncStatusResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    DeleteTeam: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description name of the team you want to delete */
                team_name: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DeleteTeamResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ListSyncedTeamMembers: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description team name */
                team_name: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListSyncedTeamMembersResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    UpdateMemberPermissionForSyncedTeam: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description team name */
                team_name: string;
                /** @description user id */
                user_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateMemberPermissionForSyncedTeamRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UpdateMemberPermissionForSyncedTeamResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ListSyncedTeamGroups: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description team name */
                team_name: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListSyncedTeamGroupsResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    AddGroupToSyncedTeam: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description team name */
                team_name: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AddGroupToSyncedTeamRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AddGroupToSyncedTeamResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    RemoveGroupFromSyncedTeam: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description team name */
                team_name: string;
                /** @description group id */
                group_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RemoveGroupFromSyncedTeamResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    UpdateGroupPermissionForSyncedTeam: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description team name */
                team_name: string;
                /** @description group id */
                group_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateGroupPermissionForSyncedTeamRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UpdateGroupPermissionForSyncedTeamResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    GetTimeSeries: {
        parameters: {
            query?: {
                /**
                 * @description Search filter is an optional HTTP parameter to filter results by.
                 *     Supported search filter keys are: [name creator group project_name workload_type status].
                 *     For example:
                 *       search_filter={"name":"My Session","workload_type":"session"}.
                 */
                search_filter?: string;
                /** @description page token for specifying which page to return. */
                page_token?: string;
                /**
                 * @description Multi column search filter is an optional HTTP parameter to filter multiple columns.
                 *     Supported Multi column search filter keys are: [project_or_workload_name].
                 *     For example:
                 *       multi_column_search_filter={"project_or_workload_name":"name"}.
                 */
                multi_column_search_filter?: string;
                /**
                 * @description Time range search filter is an optional HTTP parameter to filter based on the time.
                 *     Supported Time range search filters are: [created_time].
                 *     For example:
                 *       time_range_search_filter={"created_time":{"min":"2023-12-11 21:06:51","max":"2023-12-11 21:08:51"}}.
                 */
                time_range_search_filter?: string;
                /**
                 * @description Type of the time series.
                 *     Supported values are [cpu, memory, gpu].
                 */
                series_type?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TimeSeriesResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ListUsage: {
        parameters: {
            query?: {
                /**
                 * @description Search filter is an optional HTTP parameter to filter results by.
                 *     Supported search filter keys are: [name creator group project_name workload_type status].
                 *     For example:
                 *       search_filter={"name":"My Session","workload_type":"session"}.
                 */
                search_filter?: string;
                /**
                 * @description Sort is an optional HTTP parameter to sort results by.
                 *     Supported sort keys are: [name creator group project_name cpu memory nvidia_gpu workload_type created_at status].
                 *     where "+" means sort by ascending order, and "-" means sort by descending order.
                 *     For example:
                 *       sort=name.
                 */
                sort?: string;
                /** @description page size of the response runtime repo list. */
                page_size?: number;
                /** @description page token for specifying which page to return. */
                page_token?: string;
                /**
                 * @description Multi column search filter is an optional HTTP parameter to filter multiple columns.
                 *     Supported Multi column search filter keys are: [project_or_workload_name].
                 *     For example:
                 *       multi_column_search_filter={"project_or_workload_name":"name"}.
                 */
                multi_column_search_filter?: string;
                /**
                 * @description Time range search filter is an optional HTTP parameter to filter based on the time.
                 *     Supported Time range search filters are: [created_time].
                 *     For example:
                 *       time_range_search_filter={"created_time":{"min":"2023-12-11 21:06:51","max":"2023-12-11 21:08:51"}}.
                 */
                time_range_search_filter?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListUsageResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    GetShortUserByID: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                user_id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ShortUser"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    RotateV1Key: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description username of the user whose V1 key you want to rotate */
                username: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RotateV1KeyRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RotateV1KeyResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ListV2Keys: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description username of the user whose V2 keys you want to get */
                username: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListV2KeysResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    CreateV2Key: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description username of the user whose V2 key you want to create */
                username: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateV2KeyRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CreateV2KeyResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    DeleteV2Keys: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description username of the user whose V2 keys you want to delete */
                username: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DeleteV2KeysResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    DeleteV2Key: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description username of the user whose V2 key you want to delete */
                username: string;
                /** @description ID of the V2 key */
                key_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DeleteV2KeyResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ListUsersAcceleratorQuota: {
        parameters: {
            query?: {
                /**
                 * @description Search filter is an optional HTTP parameter to filter results by.
                 *     Supported search filter keys are: [user_id accelerator_id]
                 *     For example:
                 *     search_filter={"user_id":"1","accelerator_id":"1"}.
                 */
                search_filter?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListUsersAcceleratorQuotaResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ListTeamsAcceleratorQuota: {
        parameters: {
            query?: {
                /**
                 * @description Search filter is an optional HTTP parameter to filter results by.
                 *     Supported search filter keys are: [team_id accelerator_id]
                 *     For example:
                 *     search_filter={"team_id":"1","accelerator_id":"1"}.
                 */
                search_filter?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListTeamsAcceleratorQuotaResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ListUsersQuota: {
        parameters: {
            query?: {
                /**
                 * @description Search filter is an optional HTTP parameter to filter results by.
                 *     Supported search filter keys are: [banned deactivated].
                 *     For example:
                 *       search_filter={"deactivated":"false","banned":"false"}.
                 */
                search_filter?: string;
                /**
                 * @description Sort is an optional HTTP parameter to sort results by.
                 *     Supported sort keys are: [username].
                 *     where "+" means sort by ascending order, and "-" means sort by descending order.
                 *     For example:
                 *       sort=username.
                 */
                sort?: string;
                /** @description page size of the response runtime repo list. */
                page_size?: number;
                /** @description page token for specifying which page to return. */
                page_token?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListUsersQuotaResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ListWorkloadExecutions: {
        parameters: {
            query?: {
                /**
                 * @description Search filter is an optional HTTP parameter to filter results by.
                 *     Supported search filter keys are: [status].
                 *     For example:
                 *       search_filter={"status":"running"}.
                 */
                search_filter?: string;
                /**
                 * @description Page size is an optional argument for number of entries to return in one page.
                 *     If not specified, the server will determine a page size.
                 *     If specified, must be respecified for further requests when using the
                 *     provided next page token in the response.
                 */
                page_size?: number;
                /**
                 * @description Page token is an optional argument for specifying which page of results to get.
                 *     If not specified, the first page will be returned, including a token for the next page.
                 *     Will be empty if there is no next page.
                 */
                page_token?: string;
                /**
                 * @description Sort is an optional HTTP parameter to sort results by.
                 *     Supported sort keys are: [start_time end_time status].
                 *       sort=status.
                 */
                sort?: string;
                /**
                 * @description Multi column search filter is an optional HTTP parameter to filter multiple columns.
                 *     Supported Multi column search filter keys are: [workload_crn].
                 *     For example:
                 *       multi_column_search_filter={"workload_crn":"id"}.
                 */
                multi_column_search_filter?: string;
                /**
                 * @description Time range search filter is an optional HTTP parameter to filter based on the time.
                 *     Supported Time range search filters are: [start_time, end_time].
                 *     For example:
                 *       time_range_search_filter={"start_time":{"min":"2024-04-11T21:55:28.573Z","max":"2024-04-13T21:55:28.573Z"}}.
                 */
                time_range_search_filter?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListWorkloadExecutionsResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ListWorkloadStatus: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListWorkloadStatusResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ListWorkloadTypes: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListWorkloadTypesResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    SetWorkspaceSparkDefault: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SetWorkspaceSparkDefaultRequest"];
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SetWorkspaceSparkDefaultResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    ReadWorkspaceSparkDefault: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                is_pushdown: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReadWorkspaceSparkDefaultResponse"];
                };
            };
            /** @description An unexpected error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["runtimeError"];
                };
            };
        };
    };
    UploadFile: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The project this model belongs to. */
                project_id: string;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "multipart/form-data": {
                    /**
                     * Format: binary
                     * @description The file to upload, with the key being the location to upload to (relative to /home/cdsw)
                     */
                    file?: string;
                };
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description An unexpected error response. */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    DownloadProjectFile: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The project this model belongs to. */
                project_id: string;
                /** @description The path of the file to download */
                path: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description An unexpected error response. */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    DownloadDiagnosticsBundle: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The request id of the diagnostics bundle to download */
                request_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description An unexpected error response. */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    HandleCustomRuntimeUpload: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /**
                     * Format: binary
                     * @description Custom Runtime Addon metadata in JSON format.
                     */
                    metadata: string;
                    /**
                     * Format: binary
                     * @description Tarball with the contents of the new Custom Runtime Addon
                     */
                    tarball: string;
                };
            };
        };
        responses: {
            /** @description A successful response. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description An unexpected error response. */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
}
