# Notice
The `hack` directory is based on the [main Karmada repository](https://github.com/karmada-io/karmada/tree/master/hack).
Differences from the main repository are:
1. Removal of local building, there is no need to build locally for purpose of starting an mininal karamada environment. So the process of building binary files and container images has been eliminated. Instead, the images can be pulled from Docker Hub directly.  
2. Feature for image importing and exporting, the ability to import images make it easier to deploy mininal karamada environment in offline scenarios, no matter from local offline image files nor from your private image registry.
3. Refactoring of some original scripts, removing unnecessary code, and reusing code as much as possible for purpose of improving maintainability.
4. Introducing of [b-log](https://github.com/idelsink/b-log): logging has been made easier with hierarchical log levels. Debugging logs facilitate troubleshooting and issue resolution.
5. Modularization of the original monolithic in `util.sh`: the implementation has been split into modules based on functionality and services, making maintenance easier.
6. Adding more comments to shell functions.


# Usage
## start a mininal karmada environment
