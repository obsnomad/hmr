# hmr

This project is a demonstration of Hot Module Replacement.
I made it as a challenge to improve skills.

Execute this to run the application (be sure to have Node v18 or above):

```npm run dev```

It will open an index page in your default browser (if it hasn't been opened before).
The page will connect to WebSocket to get the updates.
When you edit an HTML document of the current page it will be reloaded.
If you update JS or CSS file it the server will recalculate their hashes and upgrade client versions accordingly.

