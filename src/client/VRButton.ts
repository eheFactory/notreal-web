/**
 * @author mrdoob / http://mrdoob.com
 * @author Mugen87 / https://github.com/Mugen87
 * @author NikLever / http://niklever.com
 */

class VRButton{
    renderer:any;
	constructor( renderer:any ) {
        this.renderer = renderer;
        
        if ( 'xr' in navigator ) {
            const button = document.createElement('button');
            button.style.display = 'none';
            button.style.height = '40px';
            document.body.appendChild(button);

            navigator.xr?.isSessionSupported('immersive-vr').then((supported)=>{
                supported ? this.showEnterVR(button) : this.showWebXRNotFound(button);
            })
		} else {
            const message = document.createElement('a');
            if(window.isSecureContext === false){
                // message.href = document.location.href.replace(/^http:/, 'https');
                message.href = document.location.href.replace('/^http:/', 'https');
                message.innerHTML = 'WEBXR NEEDS HTTPS';
            }else{
                message.href = 'https://immersiveweb.dev';
                message.innerHTML = 'WEBXR NOT AVAILABLE';
            }

            message.style.left = '0px';
            message.style.width = '100%';
            message.style.textDecoration = 'none';

            this.stylizeElement(message, false);
            message.style.bottom = '0px';
            message.style.opacity = '1';

            document.body.appendChild(message);
		}

    }

	showEnterVR( button:any ) {
        let currentSession:any = null;
        this.stylizeElement(button, true, 30, true);

        button.style.display = '';
        button.style.right = '20px';
        button.style.width = '80px';
        button.style.cursor = 'pointer';
        button.innerHTML = '<i class="fas fa-vr-cardboard"></i>';

        button.onmouseenter = () => {
            button.style.fontSize ='12px';
            button.textContent = (currentSession===null) ? 'ENTER VR' : 'EXIT VR';
            button.style.opacity = 1;
        }
        
        button.onmouseleave = () => {
            button.style.fontSize ='30px';
            button.innerHTML = '<i class="fas fa-vr-cardboard"></i>';
        }

        const onSessionStarted = (session:any) => {
            session.addEventListener('end', onSessionEnded);
            this.renderer.xr.setSession(session);

            this.stylizeElement(button, false, 12, true);

            button.textContent = 'EXIT VR';

            currentSession = session;
        }

        const onSessionEnded = () => {
            currentSession.removeEventListener('end', onSessionEnded);
            this.stylizeElement(button, true, 12, true);
            button.textContext = 'ENTER VR';
            currentSession = null;
        }

        button.onclick(()=>{
            if(currentSession===null){
                const sessionInit = {
                    optionalFeatures:['local-floor', 'bounded-floor']
                };
                navigator.xr?.requestSession('immersive-vr', sessionInit).then(onSessionStarted)
            }else{
                currentSession.end()
            }
        })
    }

    disableButton( button:any ) {

        button.style.cursor = 'auto';
        button.style.opacity = '0.5';
        
        button.onmouseenter = null;
        button.onmouseleave = null;

        button.onclick = null;

    }

    showWebXRNotFound( button:any ) { 
        this.stylizeElement(button, false);

        this.disableButton(button);

        button.style.display = '';
        button.style.width = '100%';
        button.style.right = '0px';
        button.style.bottom = '0px';
        button.style.border = '';
        button.style.opacity = '1';
        button.style.fontSize = '13px';
        button.textContent = "VR NOT SUPPORTED";
    
    }

    stylizeElement( element:any, green = true, fontSize = 13, ignorePadding = false ) {

        element.style.position = 'absolute';
        element.style.bottom = '20px';
        if (!ignorePadding) element.style.padding = '12px 6px';
        element.style.border = '1px solid #fff';
        element.style.borderRadius = '4px';
        element.style.background = (green) ? 'rgba(20,150,80,1)' : 'rgba(180,20,20,1)';
        element.style.color = '#fff';
        element.style.font = `normal ${fontSize}px sans-serif`;
        element.style.textAlign = 'center';
        element.style.opacity = '0.5';
        element.style.outline = 'none';
        element.style.zIndex = '999';
    }
};

export { VRButton };
