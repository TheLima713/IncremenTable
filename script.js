/*
CLICKING BAD / INCREMENTABLE

Developer Notes:
Caution when using the 'this' keyword in functions, and when to apply .bind(this).
Caution when defining draw functions:
    Generic functions go in the Renderer
    Object's Data-based functions go in the object itself, receiving the Renderer as a parameter


System Hierarchy:

    System
        - Config
        - Renderer
        - GameData
            - Elements[]
        - Scenes[]
            - Screens[]
            - ParticleManager
                - Atoms[]

Game Ideas:
    Element Generator object in display, spawns every X secs
    Particle accelerator upgrade, makes all atoms move faster along X secs
*/

class Effect {
    constructor(system,label) {
        this.system = system;
        this.label = label;
        
        this.countdown;
        this.currFrame = 0;
        this.duration;
        
        this.start = function(){};
        this.run = function(){};
        this.draw = function(){};
        this.end = function(){};
        
    }
    getState() {
        if(this.duration===0) return 'idle';
        if(this.countdown>0) return 'countdown';
        if(this.countdown<=0 && this.currFrame===0) return 'starting';
        if(this.countdown<=0 && this.currFrame>=this.duration) return 'ending';
        return 'running';
    }
    setTimings(countdownFrames,durationFrames) {
        this.countdown = countdownFrames;
        this.duration = durationFrames;
        return this;
    }
    setStart(fn) {
        this.start = fn;
        return this;
    }
    setRun(fn) {
        this.run = fn;
        return this;
    }
    setDraw(fn) {
        this.draw = fn;
        return this;
    }
    setEnd(fn) {
        this.end = fn;
        return this;
    }
}
//This is the class for the visuals of an Element
class Atom {
    constructor(particleManager,protons, electrons, color, screen, x = null, y = null, vx = null, vy = null) {
        this.particleManager = particleManager;
        this.protons = protons;
        this.electrons = electrons;
        this.color = color;
        this.radius = 3;
        this.screen = screen;
        
        let system = this.particleManager.scene.system;
        this.element = system.gameData.getElementByProtons(this.protons);
        
        let rndX = screen.x + Math.floor(Math.random() * screen.width);
        let rndY = screen.y + Math.floor(Math.random() * screen.height);
        this.x = x || rndX;
        this.y = y || rndY;

        this.vx = vx || 1 * (Math.random() - 0.5);
        this.vy = vy || 1 * (Math.random() - 0.5);
        
        this.angle;
    }
    getMaxProtons(level) {return level === 0 ? 1 : 6*level}
    getMaxElectrons(level) {return 2*(level + 1)**2}
    getMaxLevel(protons = this.protons, level = 0) {
        let levelProtons = this.getMaxProtons(level);
        protons -= levelProtons;
        level++;
        
        if(protons <= 0) return level;
        else return this.getMaxLevel(protons,level);
    }
    setRadius(radius) {
        this.radius = radius;
        return this;
    }
    setProtons(protons) {
        this.protons = protons;
        return this;
    }
    setElectrons(electrons) {
        this.electrons = electrons;
        return this;
    }
    setPosition(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }
    setSpeed(vx, vy) {
        this.vx = vx;
        this.vy = vy;
        return this;
    }
    setAngle(angle) {
        this.angle = angle
    }
    run() {
        this.x += this.vx;
        this.y += this.vy;
        // Bounce off walls
        let bounds = this.screen.getBounds();
        if (this.x < bounds.x || this.x > bounds.x + bounds.w) {
            this.vx *= -1;
        }
        if (this.y < bounds.y || this.y > bounds.y + bounds.h) {
            this.vy *= -1;
        }
        return this;
    }
    draw(renderer, frameCount = undefined) {
        let angleOffset = frameCount ? frameCount * 0.01 : 0;
        renderer.drawAtom(
            this.getMaxProtons,
            this.getMaxElectrons,
            this.x,
            this.y,
            this.radius,
            this.protons,
            this.electrons,
            angleOffset + (this.angle || 0),
            this.color
        );
    }
}
//This is an instance of the various upgrades an element can have
class Upgrade {
    constructor(element, cost, level, maxLevel) {
        this.element = element;

        this.cost = cost;
        this.level = 0;
        this.maxLevel = maxLevel;

        this.upgrade = function(){};
        this.getNewCost = function(){};
        this.getLabel = function(){};
        this.getDescription = function(){};
        this.getIncrease = function(){};

        let system = this.element.gameData.system;
        let scene = system.getScene('Main Scene');
        this.button = new Button(`${this.label} ${this.element.symbol}`,this)
            .setBounds({
                x: 0,
                y: 0,
                w: 0,
                h: 0
            })
            .setOnClick((event)=>{
                if(this.element.score<this.cost) return;
                if(this.level===this.maxLevel) return;//Upgrade blocked or maxxed

                this.element.score -= this.cost;
                this.upgrade();

                //Charge cost
                let system = this.element.gameData.system;
                let particleManager = system.getScene('Main Scene').particleManager;
                let element = this.element

                let availableAtoms = particleManager.atoms.filter((atom)=>{
                    return element.symbol===atom.element.symbol;
                });

                for(let i=0;i<this.cost;i++) {
                    particleManager.removeAtom(availableAtoms[i].id);
                }
                
                //Increase cost
                this.cost = this.getNewCost();//Math.floor(this.cost * this.costMultiplier, this.cost);
                this.level++;
            });
        scene.addButton(this.button);
    }
    setLabels(getLabel, getDescription, getIncrease) {
        this.getLabel = getLabel;
        this.getDescription = getDescription;
        this.getIncrease = getIncrease;
        return this;
    }
    setCostFunction(fn) {
        this.getNewCost = fn;
        return this;
    }
    setLevels(level,maxLevel) {
        this.level = level;
        this.maxLevel = maxLevel;
        return this;
    }
    setOnUpgrade(fn) {
        this.upgrade = fn;
        return this;
    }
}
//This contains the parameters for an Element's incremental and others
class Element {
    constructor(gameData, name, symbol, protons, electrons, color) {
        this.gameData = gameData;

        this.name = name;
        this.symbol = symbol;
        this.protons = protons;
        this.electrons = electrons;
        this.color = color;

        this.score = 0;
        this.increment = 1; // Default increment value
        
        this.critChance = 0.0;
        this.critMultiplier = 2;

        this.spawnTimer = 0;
        this.maxSpawnTimer = 0;

        this.upgrades = [
            new Upgrade(this, 10 + (this.protons), 0, 100)
                .setCostFunction(function(){
                    return Math.floor(this.cost * 1.25);
                })
                .setLabels(
                    function(){
                        return 'Atomic Click';
                    },
                    function(){
                        return `Clicking creates more atoms.`;
                    },
                    function(){
                        return `${this.element.increment}->${this.element.increment+1}`;
                    }
                )
                .setOnUpgrade(function(){
                    this.element.increment++;
                }),
            new Upgrade(this,25 + (10 * this.protons), 0, 100)
                .setCostFunction(function(){
                    return Math.floor(this.cost * 1.5);
                })
                .setLabels(
                    function(){
                        return 'Probability Cloud';
                    },
                    function(){
                        return `Atoms have a chance to create multiple atoms when merging.`;
                    },
                    function(){
                        return `${Math.floor(this.element.critChance * 100)}%->${Math.floor((this.element.critChance+0.1) * 100)}%`;
                    }
                )
                .setOnUpgrade(function(){
                    this.element.critChance+=0.1;
                }),
            new Upgrade(this,100 + (25 * this.protons), 1, 10)
                .setCostFunction(function(){
                    return Math.floor(this.cost * 1.75);
                })
                .setLabels(
                    function(){
                        return 'Core Density';
                    },
                    function(){
                        return `Critical merges create more atoms.`;
                    },
                    function(){
                        return `${this.element.critMultiplier}->${this.element.critMultiplier+1}`;
                    }
                )
                .setOnUpgrade(function(){
                    this.element.critMultiplier++;
                }),
            new Upgrade(this,100 + (50 * this.protons), 0, 10)
                .setCostFunction(function(){
                    return Math.floor(this.cost * 1.9);
                })
                .setLabels(
                    function(){
                        return 'Particle Generator';
                    },
                    function(){
                        return `Periodically spawn a new atom.`;
                    },
                    function(){
                        if(this.level===0) return '->10s';
                        return `${this.element.maxSpawnTimer}s->${this.element.maxSpawnTimer-1}s`;
                    }
                )
                .setOnUpgrade(function(){
                    if(this.level===0) this.element.maxSpawnTimer = 10;
                    else this.element.maxSpawnTimer--;
                }),
            new Upgrade(this,500 + (125 * this.protons), 0, 1)
                .setCostFunction(function(){
                    return -1;//one time only
                })
                .setLabels(
                    function(){
                        return 'Nuclear Fusion';
                    },
                    function(){
                        let nextElement = this.element.gameData.getElementByProtons(this.element.protons+1);
                        return `Clicks now spawn ${nextElement.name} atoms.`;
                    },
                    function(){
                        return `${this.level}/${this.maxLevel}`;
                    }
                )
                .setOnUpgrade(function(){
                    let gameData = this.element.gameData
                    let currSpawn = gameData.getElement(gameData.spawningElement);
                    let newSpawn = gameData.getElementByProtons(this.element.protons + 1);
                    if(currSpawn.protons>=newSpawn.protons) {
                        //Do nothing, not worth to downgrade the spawning element
                        return;
                    }
                    gameData.spawningElement = newSpawn.symbol;
                })
        ]

        let system = this.gameData.system;
        let scene = system.getScene('Main Scene');
        this.shopButton = new Button(`${this.name} Upgrades`, scene)
            .setBounds({
                x: 25-15,
                y: 50-15,
                w: 30,
                h: 30
            })
            .setOnClick(function(event) {
                if(system.shopElement !== null) return;
                system.openShop(symbol);
            }.bind(this))
        scene.addButton(this.shopButton);
    }
    addUpgrade(upgrade){
        this.upgrades.push(upgrade);
        
        let system = this.gameData.system;
        let scene = system.getScene('Main Scene');
        scene.addButton(upgrade.button);

        return this;
    }
    getUpgrade(label) {
        let upgrade = this.upgrades.find((upgrade)=>{return upgrade.getLabel() === label})
        if(upgrade) {
            return upgrade;
        } else {
            console.warn(`Upgrade ${upgrade} not found for ${this.name}.`);
            return null;
        }

    }
    incrementScore(ammount = this.increment) {
        this.score += ammount;
    }
    getScore() {
        return this.score;
    }
    setShopButton(button) {
        this.shopButton = button;
    }
}
class ParticleManager {
    constructor(scene) {
        this.scene = scene;
        this.atomIndex = 0;
        this.atoms = [];
    }
    run() {
        let system = this.scene.system;
        let deltaTime = 1/system.config.fps;
        let gameData = system.gameData;

        let spawnElements = gameData.unlockedElements
            .filter(function(element){
                return element.maxSpawnTimer>0;
            })
        spawnElements.forEach(function(element){
            element.spawnTimer+=deltaTime;
            if(element.maxSpawnTimer>element.spawnTimer) return;
            element.spawnTimer -= element.maxSpawnTimer;
            let atom = this.addAtom(element,this.scene.getScreen('Simulation Display'));

            let effect = new Effect(system,`Particle Generator ${element.symbol}`)
                .setTimings(0,30)
                .setDraw(function(renderer,frameCount){
                    let lerp = this.currFrame / this.duration;
                    let radiusLerp = 5 * (1 + 2 * lerp);

                    renderer.context.globalAlpha = Math.sin(Math.PI * lerp);
                    renderer.context.lineWidth = 3;

                    renderer.strokeCircle(atom.x,atom.y,radiusLerp,'white');

                    renderer.context.lineWidth = 1;
                    renderer.context.globalAlpha = 1;
                })
                .setEnd(function(){
                    let scene = this.system.getScene('Main Scene');
                    scene.removeEffect(this.id);
                })
            this.scene.addEffect(effect);
        }.bind(this))
        this.atoms.forEach(function(atom) {
            this.checkCollisions(atom);
            atom.run();
        }.bind(this));
        return this;
    }
    draw(renderer, frameCount = undefined) {
        this.atoms.forEach(function(atom) {
            atom.draw(renderer, frameCount);
        });
        return this;
    }
    addAtom(element, screen) {
        let atom = new Atom(this, element.protons, element.electrons, element.color, screen);
        atom.setAngle(2 * Math.PI * Math.random())
        element.incrementScore(1);

        atom.id = atom.id || this.atomIndex;
        this.atomIndex++;
        this.atoms.push(atom);
        return atom;
    }
    pushAtom(atom) {
        atom.id = atom.id || this.atomIndex;
        this.atomIndex++;
        this.atoms.push(atom);
        return atom;
    }
    getAtom(id) {
        return this.atoms.find(atom => atom.id === id);
    }
    removeAtom(id) {
        let atom = this.atoms.find((atom)=>{return atom.id===id});
        if(atom) {
            this.atoms.splice(this.atoms.indexOf(atom),1);
            return true;
        } else {
            console.warn(`Atom ${id} not found.`);
            return false;
        }
    }
    checkCollisions(atom1) {
        let newAtoms = [];
        
        this.atoms.forEach(function(atom2) {
            if (atom1.id === atom2.id) return;

            let dx = atom1.x - atom2.x;
            let dy = atom1.y - atom2.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            let centerDistances = atom1.radius * atom1.getMaxLevel() + atom2.radius * atom2.getMaxLevel();

            if (distance <= centerDistances && atom1.protons === atom2.protons && atom1.electrons === atom2.electrons) {
                let createdAtoms = this.mergeAtoms(atom1,atom2);
                createdAtoms.forEach((atom)=>{
                    newAtoms.push(atom);
                })
            }
        }.bind(this));
        // Add new atoms to the ParticleManager
        newAtoms.forEach(function(newAtom) {
            this.pushAtom(newAtom);
        }.bind(this));
    }
    mergeAtoms(atom1,atom2) {
        let system = this.scene.system;
        let screen = this.scene.getScreen('Simulation Display');
        let gameData = system.gameData;

        let oldElement = gameData.getElementByProtons(atom1.protons);
        let newElement = gameData.getElementByProtons(atom1.protons + 1);
        if (!newElement) {
            console.warn(`Element with ${atom1.protons + 1} protons not found in game data.`);
            return;
        }

        if(!gameData.unlockedElements.includes(newElement)) {
            gameData.addUnlockedElement(newElement);
        }

        //Calculate Crits
        let guaranteedCrits = Math.floor(oldElement.critChance);
        let rndAttempt = Math.random();
        if(rndAttempt<(oldElement.critChance-guaranteedCrits)) {
            guaranteedCrits++;
        }

        let baseMultiplier = 1;
        for(let i=0;i<guaranteedCrits;i++) {
            baseMultiplier *= oldElement.critMultiplier;
        }
        let finalMultiplier = Math.floor(baseMultiplier);
        
        //Update array
        this.atoms.splice(this.atoms.indexOf(atom1), 1);
        this.atoms.splice(this.atoms.indexOf(atom2), 1);
        oldElement.incrementScore(-2);
        
        newElement.incrementScore(finalMultiplier);
        let newAtoms = [];
        for(let i=0;i<finalMultiplier;i++) {

            let bounds = screen.getBounds();
            let offsetPosition = {
                x: 0.5 * (atom1.x + atom2.x),
                y: 0.5 * (atom1.y + atom2.y)
            }
            if(i>0) {
                offsetPosition = {
                    x: bounds.x + bounds.w * Math.random(),
                    y: bounds.y + bounds.h * Math.random()
                }
            }
            
            let newAtom = new Atom(this, newElement.protons, newElement.electrons, newElement.color, screen)
                .setPosition(
                    (offsetPosition.x),
                    (offsetPosition.y)
                )
                .setSpeed(
                    (atom1.vx + atom2.vx) / 2,
                    (atom1.vy + atom2.vy) / 2
                );
            newAtoms.push(newAtom);

            this.addMergeEffects(newAtom,newElement, i);
        }
        return newAtoms;
    }
    addMergeEffects(newAtom,newElement, i) {
        let scene = this.scene;
        let baseEffect = new Effect(this.scene.system,`Spawn ${newElement.symbol} ${i}`)
            .setTimings(0,30)
            .setDraw(function(renderer,frameCount){
                let lerp = this.currFrame / this.duration;
                let radiusLerp = newAtom.radius * newAtom.getMaxLevel() * (1 + 2 * lerp);

                renderer.context.globalAlpha = Math.sin(Math.PI * lerp);
                renderer.context.lineWidth = 3;

                renderer.strokeCircle(newAtom.x,newAtom.y,radiusLerp,'white');

                renderer.context.lineWidth = 1;
                renderer.context.globalAlpha = 1;
            })
            .setEnd(function(){
                scene.removeEffect(this.id);
            })
        let critEffect = new Effect(this.scene.system,`Crit Spawn ${newElement.symbol} ${i}`)
            .setTimings(0,30)
            .setDraw(function(renderer,frameCount){
                let lineCount = 16;
                let lerp = this.currFrame / this.duration;
                let radius = newAtom.radius * newAtom.getMaxLevel();
                let center = {
                    x: newAtom.x,
                    y: newAtom.y
                };

                for(let i=0;i<lineCount;i++) {
                    let rndAngle = 2 * Math.PI * Math.random();
                    let rndLength = radius * (0.5 + Math.random());
                    let rndStart = {
                        x: newAtom.x + (2 * radius) * Math.cos(rndAngle),
                        y: newAtom.y + (2 * radius) * Math.sin(rndAngle)
                    }
                    let rndOffset = {
                        x: (2 * Math.sin(Math.PI * lerp)) * rndLength * Math.cos(rndAngle),
                        y: (2 * Math.sin(Math.PI * lerp)) * rndLength * Math.sin(rndAngle)
                    }
                    
                    renderer.context.globalAlpha = 1-lerp;

                    renderer.fillLine(
                        rndStart.x,
                        rndStart.y,
                        rndStart.x + rndOffset.x,
                        rndStart.y + rndOffset.y,
                        'white',
                        1
                    );

                    renderer.context.globalAlpha = 1;
                }
            })
            .setEnd(function(){
                scene.removeEffect(this.id);
            })
        
        if(i===0) this.scene.addEffect(baseEffect);
        else this.scene.addEffect(critEffect);
    }
}
//This is meant to be used as a generic region collider for the mouse, the renderer's function is simply a helper
class Button {
    constructor(label, parent, x = undefined, y = undefined, width = undefined, height = undefined) {
        this.label = label;
        this.parent = parent;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.active = true;

        this.onClick = function() {};
        this.draw = function() {};
    }
    getBounds() {
        return {
            x: this.x,
            y: this.y,
            w: this.width,
            h: this.height
        };
    }
    setBounds(bounds) {
        this.x = bounds.x;
        this.y = bounds.y;
        this.width = bounds.w;
        this.height = bounds.h;
        return this;
    }
    setOnClick(fn) {
        this.onClick = fn;
        return this;
    }
    setDraw(fn) {
        this.draw = fn;
        return this;
    }
    setActive(active) {
        this.active = active;
        return this;
    }
    getActive() {
        return this.active;
    }
}
class Screen {
    constructor(scene, label) {
        this.label = label;
        this.scene = scene;
        let renderer = scene.system.renderer;
        this.x = 0;
        this.y = 0;
        this.width = renderer.width;
        this.height = renderer.height;
        this.drawIndex = 0;
        this.draw = function(){};
    }
    getBounds() {
        return {
            x: this.x,
            y: this.y,
            w: this.width,
            h: this.height
        };
    }
    setBounds(bounds) {
        this.x = bounds.x;
        this.y = bounds.y;
        this.width = bounds.w;
        this.height = bounds.h;
        return this;
    }
    setDraw(fn) {
        this.draw = fn;
        return this;
    }
}
class Scene {
    constructor(label, parent) {
        this.system = parent;
        this.label = label;
        
        this.frameCount = 0;
        let renderer = this.system.renderer;
        this.width = renderer.width;
        this.height = renderer.height;
        
        this.screenIndex = 0;
        this.screens = [];
        this.buttonIndex = 0;
        this.buttons = [];
        this.effectIndex = 0;
        this.effects = [];
        this.particleManager = new ParticleManager(this);

        this.start = function(){};
        this.run = function(){};
        this.draw = function() {
            let renderer = this.system.renderer;
            let frameCount = this.frameCount;
            this.screens.forEach(function(screen) {
                screen.draw(renderer, frameCount);
            });
            this.buttons.forEach(function(button) {
                button.draw(renderer, frameCount);
            })
            this.effects.forEach(function(effect) {
                if(effect.getState()==='idle') return;
                effect.draw(renderer, frameCount);
            })
        };
        this.end = function(){};
    }
    setStart(fn) {
        this.start = fn;
        return this;
    }
    setRun(fn) {
        this.run = fn;
        return this;
    }
    setDraw(fn) {
        this.draw = fn;
        return this;
    }
    setEnd(fn) {
        this.end = fn;
        return this;
    }
    addScreen(screen, drawIndex = undefined) {
        //Add screen to be drawn last, unless specified otherwise
        screen.drawIndex = drawIndex || this.screenIndex;
        this.screens.push(screen);
        this.screens.sort((a, b) => a.drawIndex - b.drawIndex);
        this.screenIndex++;

        return this;
    }
    getScreen(label) {
        let screen = this.screens.find((screen)=>{return screen.label === label})
        if (screen) {
            return screen;
        } else {
            console.warn(`Screen ${label} not found in scene ${this.label}.`);
            return null;
        }
    }
    addAtom(symbol, screenLabel) {
        let gameData = this.system.gameData;

        let screen = this.screens.find((screen)=>{return screen.label === screenLabel});
        let elementData = gameData.getElement(symbol);
        if (!elementData) {
            console.warn(`Element '${symbol}' not found in game data.`);
            return;
        }
        
        return this.particleManager.addAtom(elementData,screen);
    }
    addButton(button, buttonIndex = undefined) {
        button.parent = this;
        button.buttonIndex = buttonIndex || this.buttonIndex;
        this.buttons.push(button);
        this.buttons.sort((a, b) => a.buttonIndex - b.buttonIndex);
        this.buttonIndex++;

        return this;
    }
    getButton(label) {
        let button = this.buttons.find((button)=>{return button.label===label});
        if (button) {
            return button;
        } else {
            console.warn(`Button ${label} not found in scene ${this.label}.`);
            return null;
        }
    }
    removeButton(label) {
        let button = this.getButton(label);
        if (button) {
            let index = this.buttons.indexOf(button);
            this.buttons.splice(index,1);
            return true;
        } else {
            console.warn(`Button ${label} not found in scene ${this.label}.`);
            return false;
        }
    }
    addEffect(effect, effectIndex = undefined) {
        effect.parent = this;
        effect.id = effectIndex || this.effectIndex;
        this.effects.push(effect);
        this.effects.sort((a, b) => a.id - b.id);
        this.effectIndex++;

        return this;
    }
    getEffect(id) {
        let effect = this.effects.find((effect)=>{return effect.id===id});
        if (effect) {
            return effect;
        } else {
            console.warn(`Effect ${id} not found in scene ${this.label}.`);
            return null;
        }
    }
    removeEffect(id) {
        let effect = this.getEffect(id);
        if (effect) {
            let index = this.effects.indexOf(effect);
            this.effects.splice(index,1);
            return true;
        } else {
            console.warn(`Effect ${id} not found in scene ${this.label}.`);
            return false;
        }
    }
    handleEvents() {
        let events = this.system.eventBuffer;
        events.forEach(function(event) {
            console.log(event)
            if (event.type === 'click') {
                // Check if mouse position is within the bounds of any button
                let clicked = false;
                this.buttons.forEach(function(button) {
                    let bounds = button.getBounds();
                    let mousePosition = this.system.mousePosition;

                    if(mousePosition.x < bounds.x) return;
                    if(mousePosition.y < bounds.y) return;
                    if(mousePosition.x > bounds.x + bounds.w) return;
                    if(mousePosition.y > bounds.y + bounds.h) return;

                    if(clicked) return;//Already processed
                    if(button.getActive()===false) return;

                    button.onClick();
                    clicked = true;  
                    this.system.eventBuffer.shift();
                    return;
                }.bind(this));
            }
            if(event.type === 'scroll') {
                let bounds = this.getScreen('Main UI').getBounds();
                let mousePosition = this.system.mousePosition;

                if(mousePosition.x < bounds.x) return;
                if(mousePosition.y < bounds.y) return;
                if(mousePosition.x > bounds.x + bounds.w) return;
                if(mousePosition.y > bounds.y + bounds.h) return;

                let menuOffset = this.system.shopListOffset;
                let scrollDirection = Math.sign(event.deltaY);
                let shopCount = this.system.gameData.unlockedElements.length;
                
                console.log(menuOffset, scrollDirection, shopCount);

                if(menuOffset + scrollDirection < 0 || menuOffset + scrollDirection >= (shopCount)) {
                    //Do nothing, limit at edges
                    return;
                }
                this.system.shopListOffset += scrollDirection;
                this.system.eventBuffer.shift();
                return;
            }
        }.bind(this));
    }
    handleEffects() {
        this.effects.forEach(function(effect,index){
            let state = effect.getState();
            switch(state) {
                case 'idle':
                    break;
                case 'countdown':
                    effect.countdown--;
                    break;
                case 'starting':
                    effect.start();
                    effect.currFrame++;
                    break;
                case 'running':
                    effect.run(this.frameCount);
                    effect.currFrame++;
                    break;
                case 'ending':
                    effect.end();
                    effect.duration = 0;
                    break;
            }
        }.bind(this))
    }
}
class Config {
    setFPS(fps) {
        this.fps = fps;
        return this;
    }
}
class GameData {
    constructor(system) {
        this.system = system;
        this.elements = [
            new Element(this, 'Hydrogen', 'H', 1, 1, 'hsl(210, 100%, 50%)'),
            new Element(this, 'Helium', 'He', 2, 2, 'hsl(30, 100%, 50%)'),
            new Element(this, 'Lithium', 'Li', 3, 3, 'hsl(270, 100%, 50%)'),
            new Element(this, 'Beryllium', 'Be', 4, 4, 'hsl(0, 100%, 75%)'),
            new Element(this, 'Boron', 'B', 5, 5, 'hsl(180, 100%, 30%)'),
            new Element(this, 'Carbon', 'C', 6, 6, 'hsl(0, 0%, 50%)'),
            new Element(this, 'Nitrogen', 'N', 7, 7, 'hsl(0, 100%, 50%)'),
            new Element(this, 'Oxygen', 'O', 8, 8, 'hsl(180, 50%, 75%)'),
            new Element(this, 'Fluorine', 'F', 9, 9, 'hsl(60, 100%, 50%)'),
            new Element(this, 'Neon', 'Ne', 10, 10, 'hsl(240, 100%, 75%)'),
        ]
        this.spawningElement = 'H';
        this.currRecordScore = 0;
        this.unlockedElements = [this.getElement('H')];
    }
    getUnlockedElements() {
        return this.unlockedElements;
    }
    addUnlockedElement(element) {
        //Displace the next button based on the previous
        let lastElement = this.unlockedElements.slice(-1)[0];
        let lastPosition = lastElement.shopButton.getBounds();
        lastPosition.y += 50;
        element.shopButton.setBounds(lastPosition);

        this.unlockedElements.push(element);
    }
    getElement(symbol) {
        let element = this.elements.find(el => el.symbol === symbol);
        if (element) {
            return element;
        } else {
            console.warn(`Element ${symbol} not found in game data.`);
            return null;
        }
    }
    getElementByProtons(protons) {
        let element = this.elements.find(el => el.protons === protons); 
        if (element) {
            return element;
        } else {
            console.warn(`Element with ${protons} protons not found in game data.`);
            return null;
        }
    }
    getScore(symbol) {
        let element = this.elements.find(el => el.symbol === symbol);
        if (element) {
            return element.getScore();
        } else {
            console.warn(`Element ${symbol} not found in game data.`);
            return null;
        }
    }
}
class Renderer {
    constructor(canvas, width = null, height = null) {
        this.canvas = canvas;
        if (this.canvas===undefined) return;
        if(width !== null && height !== null) {
            this.width = width;
            this.height = height;
            this.canvas.width = width;
            this.canvas.height = height;
        } else {
            this.width = this.canvas.width;
            this.height = this.canvas.height;
        }
        this.aspectRatio = this.width / this.height;
        this.context = this.canvas.getContext('2d');
    }
    clearBackground(color = 'black') {
        if (this.context===undefined) return;
        this.context.fillStyle = color;
        this.context.fillRect(0, 0, this.width, this.height);
    }
    drawText(x, y, text, color = 'white', fontSize = 20) {
        if (this.context===undefined) return;
        this.context.fillStyle = color;
        this.context.font = fontSize + 'px monospace';
        let textDimensions = this.context.measureText(text);
        let textHeight = textDimensions.actualBoundingBoxAscent;
        let textWidth = textDimensions.width;
        //Canvas draw at baseline, so we need to adjust y position
        this.context.fillText(text, x, y + textHeight / 2);
        return textWidth
    }
    fillLine(x1,y1,x2,y2,color,width = 1) {
        this.context.lineWidth = width;
        this.context.strokeStyle = color;

        this.context.moveTo(x1,y1);
        this.context.lineTo(x2,y2);
        this.context.stroke();
        
        this.context.lineWidth = 1;
    }
    fillCircle(x, y, radius, color = 'white') {
        if (this.context===undefined) return;
        this.context.fillStyle = color;
        this.context.beginPath();
        this.context.arc(x, y, radius, 0, Math.PI * 2);
        this.context.fill();
    }
    strokeCircle(x, y, radius, color = 'white') {
        if (this.context===undefined) return;
        this.context.strokeStyle = color;
        this.context.beginPath();
        this.context.arc(x, y, radius, 0, Math.PI * 2);
        this.context.stroke();
    }
    drawAtom(maxProtons, maxElectrons, x, y, radius, protons = 1, electrons = 1, angleOffset = 0, color1 = 'red', color2 = 'white') {
        //let maxProtons = (level) => {return level === 0 ? 1 : 6*level}
        //let maxElectrons = (level) => {return 2*(level + 1)**2};
        let particleSize = 2;

        let protonLevel = 0;
        while(protons > 0) {
            let levelMaximum = maxProtons(protonLevel);
            let protonsToDraw = Math.min(protons, levelMaximum);

            let protonRadius = radius * (protonLevel);
            
            protons -= protonsToDraw;
            for(let i = 0; i < protonsToDraw; i++) {
                //Aesthetic layer offset
                let layerAngleDiff = angleOffset * protonLevel;

                let angle = layerAngleDiff + (i / protonsToDraw) * Math.PI * 2;
                let px = x + Math.cos(angle) * protonRadius;
                let py = y + Math.sin(angle) * protonRadius;
                this.fillCircle(px, py, particleSize, color1);
            }
            protonLevel++;
        }
        let electronLevel = 0;
        while(electrons > 0) {
            let levelMaximum = maxElectrons(electronLevel);
            let electronsToDraw = Math.min(electrons, levelMaximum);

            let electronRadius = radius * (electronLevel**2 + protonLevel);
            
            electrons -= electronsToDraw;
            for(let i = 0; i < electronsToDraw; i++) {
                //Aesthetic layer offset
                let layerAngleDiff = angleOffset * (electronLevel+1);

                let angle = layerAngleDiff + (i / electronsToDraw) * Math.PI * 2;
                let px = x + Math.cos(angle) * electronRadius;
                let py = y + Math.sin(angle) * electronRadius;
                this.fillCircle(px, py, particleSize, color2);
            }
            this.strokeCircle(x, y, electronRadius, color2);
            electronLevel++;
        }
    }
}
class System {
    constructor() {
        this.scenes = [];
        this.sceneIndex = 0;
        this.eventBuffer = [];
        this.mousePosition = { x: 0, y: 0 };
        this.config = new Config();

        this.renderer;
        this.gameData;

        this.shopElement = null;
        this.shopListOffset = 0;
    }
    startListeners() {
        //Set listeners
        document.addEventListener('mouseup', function(event) {
            if(event.target !== this.renderer.canvas) return;
            this.eventBuffer.push({
                type: 'click'
            });
        }.bind(this));
        document.addEventListener('mousemove', function(event) {
            let canvas = this.renderer.canvas;
            let canvasPosition = canvas.getBoundingClientRect();
            let dx = event.clientX - canvasPosition.left;
            let dy = event.clientY - canvasPosition.top;
            this.mousePosition.x = dx;
            this.mousePosition.y = dy;
        }.bind(this));
        document.addEventListener('wheel',function(event){
            this.eventBuffer.push({
                deltaY: event.deltaY,
                type: 'scroll'
            });
        }.bind(this));
    }
    setRenderer(renderer) {
        this.renderer = renderer;
        return this;
    }
    setGameData(gameData){
        this.gameData = gameData;
    }
    setConfig(config) {
        this.config = config;
        return this;
    }
    addScene(scene) {
        this.scenes.push(scene);
        return this;
    }
    getScene(label) {
        let scene = this.scenes.find((scene)=>{return scene.label===label});
        if(scene) {
            return scene;
        } else {
            console.warn(`Scene ${label} not found in system.`);
            return null;
        }
    }
    setGameData(gameData) {
        this.gameData = gameData;
        return this;
    }
    getGameData() {
        return this.gameData;
    }
    openShop(symbol) {
        this.shopElement = symbol;
    }
    closeShop() {
        this.shopElement = null;
    }
}

const system = new System();
startSys()
function startSys() {
    //Configure everything the system needs
    /*
    Setting system's config before or after altering the main
    'config' doesn't matter, just doing it here for clarity.
    */
    const config = new Config().setFPS(30);
    system.setConfig(config);
    const renderer = new Renderer(document.getElementById('canvas'));
    system.setRenderer(renderer);
    const scene1 = new Scene('Main Scene', system);
    system.addScene(scene1);
    const gameData = new GameData(system);
    system.setGameData(gameData);

    system.startListeners();
    
    const newAtomButton = new Button('New Atom', scene1)
        .setBounds({
            x: 0.25 * system.renderer.width,
            y: 0,
            w: 0.75 * system.renderer.width,
            h: system.renderer.height
        })
        .setOnClick(function(event) {
            let element = system.gameData.getElement(system.gameData.spawningElement);            
            let scene = system.getScene('Main Scene');
            
            for(let i=0;i<element.increment;i++) {
                scene.particleManager.addAtom(element,scene.getScreen('Simulation Display'));
            }

            let position = {
                x: system.mousePosition.x,
                y: system.mousePosition.y
            }
            let effect = new Effect(system,`Click`)
                .setTimings(0,10)
                .setDraw(function(renderer,frameCount){
                    let lerp = this.currFrame / this.duration;
                    let radiusLerp = 5 * (1 + 2 * lerp);

                    renderer.context.globalAlpha = Math.sin(Math.PI * lerp);
                    renderer.context.lineWidth = 3;

                    renderer.strokeCircle(position.x,position.y,radiusLerp,'white');

                    renderer.context.lineWidth = 1;
                    renderer.context.globalAlpha = 1;
                })
                .setEnd(function(){
                    scene.removeEffect(this.id);
                })
            scene.addEffect(effect);
        })
        .setDraw(function(renderer, frameCount) {
            return;
        })
    scene1.addButton(newAtomButton);
    
    const closeShopButton = new Button('Close Shop',scene1)
        .setBounds({
            x: 0.25 * system.renderer.width - 25,
            y: 20,//0.10 * system.renderer.height,
            w: 20,
            h: 20
        })
        .setOnClick(function(event) {
            if(system.shopElement === null) return;
            let upgrades = system.gameData.getElement(system.shopElement).upgrades;
            upgrades.forEach((upgrade,index)=>{
                upgrade.button.setActive(false);
            })
            system.closeShop();
        })
        .setDraw(function(renderer, frameCount) {
            if(system.shopElement === null) return;

            let box = this.getBounds();
            renderer.context.fillStyle = 'rgba(255, 0, 0, 0.5)';
            renderer.context.fillRect(box.x, box.y, box.w, box.h);

            renderer.drawText(box.x + box.w/4,box.y + box.h/2,'X','white',20);
            return;
        });
    scene1.addButton(closeShopButton);

    scene1
        .setStart(function() {
            this.run();
        })
        .setRun(function() {
            this.frameCount++;
            this.particleManager.run();

            this.handleEvents();
            this.handleEffects();
            this.draw();

            setTimeout(this.run.bind(this), 1000/config.fps);
        })
        
        const simulationDisplay = new Screen(scene1, 'Simulation Display')
            .setBounds({
                x: 0.25 * renderer.width,
                y: 0,
                w: 0.75 * renderer.width,
                h: renderer.height
            })
            .setDraw(function(renderer, frameCount) {
                let box = this.getBounds();

                renderer.clearBackground('black');
                let scene = this.scene;

                scene.particleManager.draw(renderer, scene.frameCount);
            })
        const mainUI = new Screen(scene1, 'Main UI')
            .setBounds({
                x: 0,
                y: 0,
                w: 0.25 * renderer.width,
                h: renderer.height
            })
            .setDraw(function(renderer, frameCount) {
                if(system.shopElement!==null) return;

                let box = this.getBounds();
                renderer.context.fillStyle = 'rgba(255, 255, 255, 0.1)';
                renderer.context.fillRect(box.x, box.y, box.w, box.h);
                
                let gameData = this.scene.system.gameData;

                //Get unlocked elements, and show starting at the general menu position
                let displayElements = gameData.getUnlockedElements().slice(system.shopListOffset);

                displayElements.forEach(function(element, index) {
                    let box = element.shopButton.getBounds();
                                    
                    let system = element.gameData.system;
                    let scene = system.getScene('Main Scene');

                    let startX = 25;
                    let startY = 50;

                    renderer.context.globalAlpha = 0.3;
                    renderer.context.fillStyle = element.color;
                    renderer.context.fillRect(box.x,box.y,box.w,box.h);
                    renderer.context.globalAlpha = 1;

                    let atom = new Atom(scene.particleManager, element.protons, element.electrons, element.color, element)
                        .setPosition(startX, startY + 50 * index)
                        .setRadius(5);
                    atom.draw(renderer, frameCount);

                    renderer.drawText(startX + 25, startY + 50 * index,`${element.name} Atoms: ${element.getScore()}`, 'white', 15);
                })
            })
        const shopUI = new Screen(scene1, 'Shop UI')
            .setBounds({
                x: 0,
                y: 0,
                w: 0.25 * renderer.width,
                h: renderer.height
            })
            .setDraw(function(renderer,frameCount){
                if(system.shopElement===null) {
                    return;
                }

                //Reactive upgrade buttons
                let box = this.getBounds();
                let element = system.gameData.getElement(system.shopElement);
                let upgrades = element.upgrades;
                upgrades.forEach((upgrade,index)=>{
                    upgrade.button.setActive(true);
                })
                
                //Draw Background
                renderer.context.globalAlpha = 0.1;
                renderer.context.fillStyle = element.color;
                renderer.context.fillRect(box.x, box.y, box.w, box.h);
                renderer.context.globalAlpha = 1;

                //Helper vars
                let shift = 0;
                let drawX = 20;
                let drawY = 20;
                let lineHeight = 30;

                let jumpLine = ()=>{drawY += lineHeight}
                let shiftLine = ()=>{drawX += shift}
                let unshiftLine = ()=>{drawX -= shift}
                
                let restartX = ()=>{drawX = 20}
                let restartY = ()=>{drawY = 20}
                
                //Draw Menu
                renderer.drawText(drawX,drawY,`${element.name} Shop`,'white',20);
                jumpLine();

                let particleManager = system.getScene('Main Scene').particleManager;
                let atom = new Atom(particleManager, element.protons, element.electrons, element.color, element);
                
                shift = renderer.drawText(drawX,drawY,`Points: ${element.score}`,'white',17);
                shift += 10 * atom.getMaxLevel();
                shiftLine();
                
                atom.setPosition(drawX, drawY)
                    .setRadius(5)
                    .draw(renderer, frameCount);

                unshiftLine();

                //Draw Upgrade List
                upgrades.forEach((upgrade,index)=>{
                    renderer.context.font = '20px monospace';
                    let textDimensions = renderer.context.measureText(upgrade.getLabel());
                    let textWidth = textDimensions.width;
                    let heightOffset = textDimensions.actualBoundingBoxAscent/2;

                    jumpLine();

                    let padding = {
                        x: 5,
                        y: 5,
                        w: 10,
                        h: 5
                    }
                    let button = upgrade.button
                        .setBounds({
                            x: drawX - padding.x,
                            y: drawY - padding.y,
                            w: textWidth + padding.w,
                            h: 20 + padding.h
                        })
                    let buttonBounds = button.getBounds();
                    
                    //Draw Outline and Title
                    renderer.context.globalAlpha = 0.2;
                    renderer.context.fillStyle = '#fff';
                    renderer.context.fillRect(buttonBounds.x, buttonBounds.y, buttonBounds.w, buttonBounds.h);
                    renderer.context.globalAlpha = 1;
                    
                    if(element.score<upgrade.cost || upgrade.level === upgrade.maxLevel) {
                        renderer.context.globalAlpha = 0.5;
                    }
                    let costDisplay = `${upgrade.cost} (${upgrade.getIncrease()})`;
                    if(upgrade.level === upgrade.maxLevel) costDisplay = 'Max';
                    shift = renderer.drawText(
                        buttonBounds.x + padding.x,
                        buttonBounds.y + padding.y + heightOffset,
                        `${upgrade.getLabel()} : ${costDisplay}`,
                        'white',
                        20
                    );
                    shift += 10 * atom.getMaxLevel();
                    
                    shiftLine();
                    atom.setPosition(drawX,drawY + heightOffset)
                        .draw(renderer,frameCount);
                    unshiftLine();
                    
                    //Write description
                    jumpLine();
                    let descriptionsWords = upgrade.getDescription().split(' ');
                    let maxDescriptionWidth = 250;
                    descriptionsWords.forEach(function(word){
                        if(maxDescriptionWidth < drawX) {
                            jumpLine();
                            restartX();
                            shift = 0;
                        }
                        renderer.context.font = '17px monospace';
                        shift = renderer.drawText(
                            drawX,
                            drawY + heightOffset,
                            word + ' ',
                            'white',
                            17
                        );
                        shiftLine();
                    })
                    jumpLine();
                    restartX();
                    shift = 0;
                    
                    renderer.context.globalAlpha = 1;
                })
            })

        scene1.addScreen(simulationDisplay);
        scene1.addScreen(mainUI);
        scene1.addScreen(shopUI);

    // Run the first scene
    system.getScene('Main Scene').start();
}