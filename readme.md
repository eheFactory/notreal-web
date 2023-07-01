


## Accessing the gamepad
1. Use `fetchprofile` method to get a JSON file that outlines the buttons and touchpads or thumbsticks available for the specific controller you're interested in.
2. For most purposes you will simply need to store the indicies of the various buttons and for touchpads and thumbsticks also the indicies of the axes.
3. Then when you get the gamepad you can map the buttons array and axes array to the relevant button



## Info
- **Quaternion :** Quaternion property defines orientation.

- Each element in the intersect array contains an object that includes these items:
    - distance: distance between the origin of the ray and the intersection
    - point: point of the intersection, in world coordinates
    - object: the intersect object
    - uv: U,V coordinates at point of intersection
