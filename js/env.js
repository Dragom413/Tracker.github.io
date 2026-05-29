window.isEntornoLocal = function () {
    const host = window.location.hostname;
    return (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '[::1]' ||
        host === '0.0.0.0' ||
        window.location.protocol === 'file:' ||
        new URLSearchParams(window.location.search).get('modo') === 'local'
    );
};
if (window.isEntornoLocal()) {
    document.documentElement.classList.add('entorno-local');
    document.title = 'Media Tracker Pro (Local)';
}
