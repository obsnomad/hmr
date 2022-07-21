const connect = (reconnect = false) => {
    const ws = new WebSocket('ws://localhost:config.wsPort');

    const send = (type, value) => ws.send(JSON.stringify({ type, value }));

    ws.onopen = () => {
        send('connect', { location: location.pathname, reconnect });
    };

    ws.onmessage = ({ data }) => {
        const { type, value } = JSON.parse(data);

        switch (type) {
            case 'rewrite':
                document.open('text/html');
                document.write(value);
                document.close();
                break;
            case 'upgrade':
                const [ext] = value.filename.match(/\.\w+$/);
                if (ext === '.js') {
                    document.querySelector(`script[src^="${value.filename}"]`)?.remove();
                    const newElement = document.createElement('script');
                    newElement.src = `${value.filename}?${value.hash}`;
                    document.querySelector('head').append(newElement);
                } else if (ext === '.css') {
                    const element = document.querySelector(`link[href^="${value.filename}"]`);
                    element.href = `${value.filename}?${value.hash}`;
                }
                break;
        }
    };

    ws.onerror = () => ws.close();

    ws.onclose = () => setTimeout(() => connect(true), 1000);
}

connect();
