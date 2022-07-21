# hmr

This project is a demonstration of Hot Module Replacement.
I made it as a challenge to improve skills.

Execute this to run the application (be sure to have Node v18 or above):

```npm run dev```

It will open an index page in your default browser (if it hasn't been opened before).
The page will connect to WebSocket to get the updates.
When you edit an HTML document of the current page it will be reloaded.
If you update JS or CSS file the server will recalculate their hashes and upgrade client versions accordingly.
Be noted that in this version changes in files imported to JS or CSS files won't update their root file hashes thus failing to update client versions.
