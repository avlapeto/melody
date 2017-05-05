(()=>{
    class Note{
        constructor(octave, key, duration){
            this.octave = octave;
            this.key = key;
            this.duration = duration;

        }
        isValid(){
            return Number.isInteger(Math.log2(this.duration)) && this.duration >= 1
                && this.key <=7 && this.key >= 1
                && this.octave <=7 && this.octave >= 1;
        };
        template(left, rigth){
            let paddingRight= rigth > 0 ? rigth : this.duration,
                cls = '',
                i = 0;

            if (this.duration < 16) cls += `note-solid`;


            //validate correct duration. Possible value 1/2/4..32
            if(!this.isValid(this.duration)) {
                new MelodyError(`Invalid note parameters!`);
                return '';
            }

            return `<span class="note note-${this.duration}  ${cls}" style="padding-left: ${left*5}px; padding-right: ${paddingRight * 5}px;"><span class="note-inner" style="bottom: ${((this.octave - 2) * 7  + this.key)*3}px;"></span></span>`
        };

        getKeyCode(){
            let keys = {
                1 : 0,
                2 : 2,
                3 : 4,
                4 : 5,
                5 : 7,
                6 : 9,
                7 : 11,
            };

            return (this.octave - 1) * 11 + keys[this.key] + 24;
        }

    }

    class Music{
        constructor(id, player){
            this.id = id;
            this.player = player;
            this.notes = [];
            this.staffs = [];
            this.template = '';
        };
        getNotes(url){

            let promise = new Promise((resolve, reject) => {

                let xhr = new XMLHttpRequest();
                let  body = 'url=' + encodeURIComponent(url);
                // xhr.open('GET', '/source/melody.json', true);
                xhr.open('POST', '/api/melody.php', true);
                xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                xhr.timeout = 30000;

                xhr.ontimeout = function() {
                    reject( `Sorry, server don't response...`);
                };
                xhr.send(body);

                xhr.onreadystatechange = function() {
                    if (this.readyState != 4) return;

                    if (this.status != 200) {
                        reject( `Sorry, error on server...`);

                    }

                    resolve(JSON.parse(this.responseText));

                }

            });

            return promise;

        };


        paint(){
            let div = document.querySelector(`div#${this.id}`),
                initial = 0,
                staff = new Staff(this.player, initial);
            this.staffs = [staff];

            this.template = '<div class="box-notes-container">';

            this.notes.forEach((note, index, arr)=>{
                note = new Note(note.octave, note.key, note.duration);

                if(!staff.canAppendNote()){
                    initial = staff.duration - staff.maxDuration;
                    this.template += staff.getTemplate();

                    staff = new Staff(this.player, initial);
                    this.staffs.push(staff);
                }

                //TODO: This is bad solution because arr.length call time after time
                staff.appendNote(note, index === arr.length - 1);
            });

            this.template += staff.getTemplate();
            this.template += '</div>';

            if(div){
                div.querySelector('div.box-notes-container').outerHTML = this.template;

            }else{
                div = document.createElement('div');
                div.id = this.id;
                div.classList.add('note-box');
                this.template += `<div><input type="button" class="button-play" value="Play"></div>`;
                div.innerHTML = this.template;
                document.querySelector(`.wrapper`).appendChild(div);

            }


        };

        handler(event){
            if(event.target.className.includes('note-inner')){
                let notes = document.querySelectorAll(`div#${this.id} span.note-inner`);
                let arr = Array.prototype.slice.call(notes);
                let index = arr.indexOf(event.target);

                this.notes.splice(index, 1);

                this.paint(this.notes);
                event.preventDefault();
            }

            if(event.target.className.includes('block-notes')){
                let staffs = document.querySelectorAll(`div#${this.id} .block-notes`);
                let arr = Array.prototype.slice.call(staffs);
                let index = arr.indexOf(event.target);

                this.player.timeline = 0;

                this.staffs[index].play();
                event.preventDefault();
            }
        };

        listen(){
            document.querySelector(`div#${this.id}`)
                .addEventListener('click', this.handler.bind(this));

            document.querySelector(`div#${this.id} input.button-play`)
                .addEventListener('click', this.play.bind(this));
        };

        play(){
            this.player.timeline = 0;

            this.staffs.forEach((staff)=>{
                staff.play();
            });
        };

    };

    class Staff{
        constructor(player, initial){
            this.initial = initial ? initial : 0;
            this.player = player;
            this.duration = this.initial;
            this.maxDuration = 32;
            this.notes = [];
            this.template = '';
        }

        getTemplate(){
            return `<div class="block-notes">${this.template}</div>`;
        };

        canAppendNote(){
            return this.duration < this.maxDuration;
        }

        appendNote(note, last = false){
            let right = 0,
                left = 0;

            this.notes.push(note);
            this.duration += note.duration;

            //We also can append note here but this action will affect the performance
            if(!this.canAppendNote() || last){
                right = this.maxDuration - this.duration + note.duration
            };

            if(this.notes.length === 1){
                left = this.initial;
            };

            this.template += note.template(left, right);

        };

        play(){

            this.notes.forEach((note, index)=>{
                index == 0 ? this.player.play(note, this.initial) : this.player.play(note, 0);
            })


        };
    };

    class Player{
        constructor(){
            this.timeline = 0;
        }

        play(note, initial = 0){
            this.timeline += (initial + note.duration)/32;

            MIDI.noteOn(0, note.getKeyCode(), 127, this.timeline);
            MIDI.noteOff(0, note.getKeyCode(), this.timeline + (note.duration/32));
        }
    }

    class MelodyError extends Error {
        constructor(message){
            super(message);
            this.message = message;
            this.log();
        }

        log(){
            let div;
            console.debug(this.message);
            div = document.createElement('div');
            div.classList.add('error');
            div.innerHTML = this.message;
            document.querySelector("div.error-container").appendChild(div);
        }
    }





    window.onload = function () {
        let player = new Player();

        document.querySelector('input.button-add-melody').addEventListener('click', ()=>{
            let id = document.querySelector('.id-url-melody').value;
            let url = document.querySelector('.text-url-melody').value;

            if (!/^[a-z0-9]+$/i.test(id)) {
                new MelodyError("Invalid id, must contain only a-z or 0-9 symbols");
                return;
            };

            if(!url || !id) return;

            if(document.querySelector('#id')) return;
            let music  = new Music(id, player);

            music.getNotes(url).then(

                notes => {
                    if (notes.error) {
                        new MelodyError("Invalid JSON");
                        return;
                    }

                    document.querySelector('.id-url-melody').value = `id${document.querySelectorAll('div[id].note-box').length + 2}`;
                    music.notes = notes;
                    music.paint();
                    music.listen();

                }

            ).catch(e =>{
                new MelodyError(e);
            });
        });

        MIDI.loadPlugin({
            soundfontUrl: "./soundfont/",
            instrument: "acoustic_grand_piano",
            onprogress: function(state, progress) {
            },
            onsuccess: function() {
                MIDI.setVolume(0, 80);
            }

        });
    };
})();
