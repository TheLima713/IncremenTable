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
             - Upgrades[]
        - Scenes[]
            - Screens[]
            - ParticleManager
                - Atoms[]

Game Ideas:
    Element Generator object in display, spawns every X secs
    Particle accelerator upgrade, makes all atoms move faster along X secs

ERRORS TO FIX:
- On merging with 200%+ criticals, with too many atoms, previous element becomes negative due to removing too many
- fractional values are being incremented and losing a bit (ex: crit chance from 70%->79% intead of 80%)
*/

class Vector {
    constructor(x,y) {
        this.x = x;
        this.y = y;
    }
    add(v2) {
        let out = new Vector(
            this.x + v2.x,
            this.y + v2.y
        )
        return out;
    }
    sub(v2) {
        let out = new Vector(
            this.x - v2.x,
            this.y - v2.y
        )
        return out;
    }
    mult(v2) {
        let out = new Vector(
            this.x * v2.x,
            this.y * v2.y
        )
        return out;
    }
    div(v2) {
        if(v2.x===0 || v2.y===0) {
            console.warn(`Error: Division by zero on Vector.div().`, this);
            return;
        }
        let out = new Vector(
            this.x / v2.x,
            this.y / v2.y
        )
        return out;
    }
    scl(scale) {
        let out = new Vector(
            this.x * scale,
            this.y * scale
        )
        return out;
    }
    mag() {
        return Math.sqrt((this.x**2) + (this.y**2));
    }
    dot(v2, normalized = true) {
        if(this.mag()===0) {
            console.warn(`Vector.mag()===0 on Vector.dot()`, this);
            return 0;
        }
        let out = this.x * v2.x + this.y * v2.y;
        if(normalized) out /= this.mag();
        return out;
    }
    rot(ang) {
        let out = new Vector(
            Math.cos(ang) * this.x - Math.sin(ang) * this.y,
            Math.cos(ang) * this.y + Math.sin(ang) * this.x
        )
        return out;
    }
    lerp(v2,t) {
        //L = A + T * (B - A)
        let out = v2.sub(this)
            .scl(t)
            .add(this);
        return out;
    }
    normalize() {
        return this.scl(1/this.mag());
    }
    copy(v2) {
        this.x = v2.x;
        this.y = v2.y;
        return this;
    }
    fromAng(ang) {
        this.x = Math.cos(ang);
        this.y = Math.sin(ang);
        return this;
    }
    toAng() {
        return Math.atan2(this.y,this.x);
    }
    random() {
        return new Vector(Math.random(),Math.random());
    }
    equals(v2) {
        return this.x===v2.x&&this.y===v2.y;
    }
    floor() {
        let out = new Vector(Math.floor(this.x),Math.floor(this.y));
        return out;
    }
}
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
    constructor(particleManager,protons, electrons, color, screen, position = undefined, velocity = undefined) {
        this.particleManager = particleManager;
        this.protons = protons;
        this.electrons = electrons;
        this.color = color;
        this.radius = 4;
        this.screen = screen;
        this.state = 'active';
        
        let system = this.particleManager.scene.system;
        this.element = system.gameData.getElementByProtons(this.protons);
        
        if(position===undefined) this.position = new Vector().random().mult(screen.size).add(screen.position);
        else this.position = position;
        if(velocity===undefined) this.velocity = new Vector().random().sub(new Vector(0.5,0.5));
        else this.velocity = velocity;        
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
    setPosition(position) {
        this.position = position;
        return this;
    }
    setSpeed(velocity) {
        this.velocity = velocity;
        return this;
    }
    setAngle(angle) {
        this.angle = angle
    }
    setState(state) {
        this.state = state;
        return this;
    }
    getState() {
        return this.state;
    }
    run() {
        if(this.state==='active') {
            this.position = this.position.add(this.velocity);
            // Bounce off walls
            let bounds = this.screen.getBounds();
            if (this.position.x < bounds.x || this.position.x > bounds.x + bounds.w) this.velocity = this.velocity.mult(new Vector(-1,1));
            if (this.position.y < bounds.y || this.position.y > bounds.y + bounds.h) this.velocity = this.velocity.mult(new Vector(1,-1));
        }
        if(this.state==='storing') {
            //Animation: Orbit Vial

            let dist = this.element.vialPosition.sub(this.position);
            
            let vialVersor = dist.normalize();
            let vialVersorLeft = vialVersor.rot(-60 * Math.PI/180);
            let lerpScale = (1-dist.mag()/1000);//Far->Close : 0 -> 1
            let lerpDirection = vialVersorLeft.lerp(vialVersor,lerpScale);

            let lerpStrength = this.element.vialStoreSpeed*(2 + Math.abs(Math.cos(Math.PI * lerpScale)));
            this.velocity = lerpDirection.scl(Math.min(lerpStrength,0.9 * dist.mag()));
            //Prevent overshooting
            if(this.velocity>dist.mag()) this.velocity = this.velocity.normalize().scl(0.5 * dist.mag());
            this.position = this.position.add(this.velocity);

            if(dist.mag() < 25) {
                this.particleManager.removeAtom(this.id);
                this.element.vialAtomCount++;
                this.state = 'stored';
            }
        }
        if(this.state==='stored') {
        }
        return this;
    }
    draw(renderer, frameCount = undefined) {
        let renderType = this.particleManager.scene.renderType;
        switch(renderType) {
            case 'Default':
                let angleOffset = frameCount ? frameCount * 0.01 : 0;
                renderer.drawAtom(
                    this.getMaxProtons,
                    this.getMaxElectrons,
                    this.position,
                    this.radius,
                    this.protons,
                    this.electrons,
                    angleOffset + (this.angle || 0),
                    this.color
                );
                break;
            case 'Minimal':
                renderer.fillCircle(
                    this.position,
                    this.radius * this.getMaxLevel(),
                    this.color
                )
        }
    }
}
//This is an instance of the various upgrades an element can have
class Upgrade {
    constructor(element, label, cost, level, maxLevel) {
        this.element = element;

        this.label = label;
        this.cost = cost;
        this.level = level;
        this.maxLevel = maxLevel;
        this.state = 'locked';
        this.dependantUpgrades = [];

        this.upgrade = function(){};
        this.getNewCost = function(){};
        this.getLabel = function(){};
        this.getDescription = function(){};
        this.getIncrease = function(){};

        this.system = this.element.gameData.system;
        let scene = system.getScene('Main Scene');
        this.button = new Button(`${this.label} ${this.element.symbol}`,'click', this, new Vector(0,0), new Vector(0,0))
            .setOnClick((event)=>{
                this.handleUpgradeAction();
            });
        scene.addButton(this.button);
    }
    setLabels(getDescription, getIncrease) {
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
    setState(state) {
        this.state = state;
        return this;
    }
    setDependantUpgrades(arr) {
        this.dependantUpgrades = arr;
        return this;
    }
    handleUpgradeAction() {
        if(this.element.score<this.cost) return;
        if(this.level===this.maxLevel) return;//Upgrade blocked or maxxed

        this.element.score -= this.cost;
        this.upgrade();

        //Charge cost
        let pendingCost = this.cost;
        if(this.element.maxVialAtomCount>0) {
            let costFromVial = Math.min(this.element.vialAtomCount, pendingCost);
            this.element.vialAtomCount -= costFromVial;
            pendingCost -= costFromVial;
        }
        let system = this.element.gameData.system;
        let particleManager = system.getScene('Main Scene').particleManager;
        let element = this.element

        let availableAtoms = particleManager.atoms.filter((atom)=>{
            return element.symbol===atom.element.symbol;
        });

        let atomsToRemove = availableAtoms.slice(0,pendingCost);
        atomsToRemove.forEach(function(atom){
            particleManager.removeAtom(atom.id);
        })
        
        //Unlock related upgrades
        if(this.level===0) {
            //Unlock other Vial Upgrades
            let upgradeLabels = this.dependantUpgrades;
            upgradeLabels.forEach(function(label){
                let upgrade = this.element.getUpgrade(label);
                if(upgrade.state==='locked') upgrade.setState('unlocked');
            }.bind(this))
        }

        //Increase cost
        this.cost = this.getNewCost();//Math.floor(this.cost * this.costMultiplier, this.cost);
        this.level++;
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
        this.vialPosition;
        //PREP: maybe add locked/unlocked or states for more organization

        this.score = 0;
        this.increment = 1; // Default increment value
        
        this.critChance = 0.0;
        this.critMultiplier = 2;

        this.spawnTimer = 0;
        this.maxSpawnTimer = 0;

        this.vialAtomCount = 0;
        this.maxVialAtomCount = 0;
        this.vialStoreSpeed = 5;
        this.vialStoreCount = 5;

        this.upgradeShopOffset = 0;//index for shop
        this.upgrades = [
            new Upgrade(this, 'Atomic Click', 10 + (this.protons), 0, 100)
                .setCostFunction(function(){
                    return Math.floor(this.cost * 1.25);
                })
                .setLabels(
                    function(){
                        return `Clicking creates more atoms.`;
                    },
                    function(){
                        let curr = this.system.formatNumber(this.element.increment);
                        let next = this.system.formatNumber(this.element.increment+1);
                        return `(${curr}->${next})`;
                    }
                )
                .setOnUpgrade(function(){
                    this.element.increment++;
                })
                .setState('unlocked'),
            new Upgrade(this, 'Particle Generator',40 + (10 * this.protons), 0, 10)
                .setCostFunction(function(){
                    return Math.floor(this.cost * 1.9);
                })
                .setLabels(
                    function(){
                        return `Periodically spawn a new atom.`;
                    },
                    function(){
                        if(this.level===0) return '(->5s)';
                        let curr = this.system.formatNumber(this.element.maxSpawnTimer);
                        let next = this.system.formatNumber(this.element.maxSpawnTimer-1);
                        return `(${curr}s->${next}s)`;
                    }
                )
                .setOnUpgrade(function(){
                    if(this.level===0) this.element.maxSpawnTimer = 5;
                    else this.element.maxSpawnTimer--;
                })
                .setState('unlocked'),
            new Upgrade(this,'Vial Capacity', 100 + (5 * this.protons), 0, 100)
                .setCostFunction(function(){
                    return Math.floor(this.cost * 1.3);
                })
                .setLabels(
                    function(){
                        return `Store ${this.element.name} atoms outside the simulation.`;
                    },
                    function(){
                        let curr = this.system.formatNumber(this.element.maxVialAtomCount);
                        let next = this.system.formatNumber(this.element.maxVialAtomCount+500);
                        return `(${curr}->${next})`;
                    }
                )
                .setOnUpgrade(function(){
                    this.element.maxVialAtomCount += 500;
                })
                .setState('unlocked')
                .setDependantUpgrades(['Sampling Speed','Sample Size']),
            new Upgrade(this,'Sampling Speed',125 + (5 * this.protons), 0, 100)
                .setCostFunction(function(){
                    return Math.floor(this.cost * 1.4);
                })
                .setLabels(
                    function(){
                        return `Vials store atoms faster.`;
                    },
                    function(){
                        let curr = this.system.formatNumber(this.element.vialStoreSpeed);
                        let next = this.system.formatNumber(this.element.vialStoreSpeed+5);
                        return `(${curr}->${next})`;
                    }
                )
                .setOnUpgrade(function(){
                    this.element.vialStoreSpeed += 5;
                })
                .setState('locked'),
            new Upgrade(this,'Sample Size',150 + (5 * this.protons), 0, 100)
                .setCostFunction(function(){
                    return Math.floor(this.cost * 1.4);
                })
                .setLabels(
                    function(){
                        return `Vials store more atoms at once.`;
                    },
                    function(){
                        let curr = this.system.formatNumber(this.element.vialStoreCount);
                        let next = this.system.formatNumber(this.element.vialStoreCount+5);
                        return `(${curr}->${next})`;
                    }
                )
                .setOnUpgrade(function(){
                    this.element.vialStoreCount += 5;
                })
                .setState('locked'),
            new Upgrade(this,'Nuclear Fusion',100 + (10 * this.protons), 0, 1)
                .setCostFunction(function(){
                    return -1;//one time only
                })
                .setLabels(
                    function(){
                        let nextElement = this.element.gameData.getElementByProtons(this.element.protons+1);
                        if(!nextElement) return ''

                        return `Unlock ${nextElement.name} atoms.`;
                    },
                    function(){
                        let nextElement = this.element.gameData.getElementByProtons(this.element.protons+1);
                        if(!nextElement) return '';

                        return ``;
                    }
                )
                .setOnUpgrade(function(){
                    let nextElement = this.element.gameData.getElementByProtons(this.element.protons+1);
                    if(!nextElement) return '';
                    
                    this.element.gameData.addUnlockedElement(nextElement);
                })
                .setState('unlocked')
                .setDependantUpgrades(['Valence Bond']),
            new Upgrade(this,'Probability Cloud',20 + (10 * this.protons), 0, 100)
                .setCostFunction(function(){
                    return Math.floor(this.cost * 1.5);
                })
                .setLabels(
                    function(){
                        return `Atoms have a chance to create multiple atoms when merging.`;
                    },
                    function(){
                        let curr = this.system.formatNumber(Math.floor((this.element.critChance) * 100));
                        let next = this.system.formatNumber(Math.floor((this.element.critChance+0.1) * 100));
                        return `(${curr}%->${next}%)`;
                    }
                )
                .setOnUpgrade(function(){
                    this.element.critChance+=0.1;
                })
                .setState('unlocked'),
            new Upgrade(this,'Core Density',30 + (10 * this.protons), 1, 10)
                .setCostFunction(function(){
                    return Math.floor(this.cost * 1.75);
                })
                .setLabels(
                    function(){
                        return `Critical merges create more atoms.`;
                    },
                    function(){
                        let curr = this.system.formatNumber(this.element.critMultiplier);
                        let next = this.system.formatNumber(this.element.critMultiplier+1);
                        return `(${curr}->${next})`;
                    }
                )
                .setOnUpgrade(function(){
                    this.element.critMultiplier++;
                })
                .setState('locked'),
            new Upgrade(this,'Valence Bond',300 + (10 * this.protons), 0, 1)
                .setCostFunction(function(){
                    return -1;//one time only
                })
                .setLabels(
                    function(){
                        let nextElement = this.element.gameData.getElementByProtons(this.element.protons+1);
                        if(!nextElement) return ''

                        return `Clicks now spawn ${nextElement.name} atoms.`;
                    },
                    function(){
                        let nextElement = this.element.gameData.getElementByProtons(this.element.protons+1);
                        if(!nextElement) return '';

                        return ``;
                    }
                )
                .setOnUpgrade(function(){
                    let nextElement = this.element.gameData.getElementByProtons(this.element.protons+1);
                    if(!nextElement) return '';
                    
                    if(this.element.protons>=nextElement.protons) {
                        //Do nothing, not worth to downgrade the spawning element
                        return '';
                    }
                    this.element.gameData.spawningElement = nextElement.symbol;
                })
                .setState('locked')
        ]

        let system = this.gameData.system;
        let scene = system.getScene('Main Scene');
        this.shopButton = new Button(`${this.name} Upgrades`, 'click', scene, new Vector(0,0), new Vector(0,0))
            .setBounds({
                x: 0,
                y: 0,
                w: 0,
                h: 0
            })
            .setOnClick(function(event) {
                if(system.shopElement !== null) return;//shop already open
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
        let upgrade = this.upgrades.find((upgrade)=>{return upgrade.label === label})
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
    setVialPosition(position) {
        this.vialPosition = position;
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

        //Handle Spawners
        let spawnElements = gameData
            .unlockedElements
            .filter(function(element){
                return element.maxSpawnTimer>0;
            });
        spawnElements.forEach(function(element){
            this.handleAtomSpawner(element,deltaTime);
        }.bind(this));
        
        //Handle Vials

        let vialElements = gameData
            .unlockedElements
            .filter(function(element){
                return element.maxVialAtomCount>0;
            });
        vialElements.forEach(function(element,index){
            this.handleVialStore(element, deltaTime);
        }.bind(this))
        //Handle Collisions
        this.atoms.forEach(function(atom, index) {
            this.atoms[index].collided = false;
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
            if (atom1.collided === true) return;
            if (atom2.collided === true) return;
            if (atom1.state !== 'active') return;
            if (atom2.state !== 'active') return;

            let distance = atom1.position.sub(atom2.position).mag();
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
            return [];
        }

        if(!gameData.unlockedElements.includes(newElement)) {
            return [];
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
            let offsetPosition = atom1.position.add(atom2.position).scl(0.5);
            if(i>0) offsetPosition = new Vector().random().mult(screen.size).add(screen.position);
            
            let newAtom = new Atom(this, newElement.protons, newElement.electrons, newElement.color, screen)
                .setPosition(offsetPosition)
                .setSpeed(atom1.velocity.add(atom2.velocity).scl(0.5));
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

                renderer.strokeCircle(
                    newAtom.position,
                    radiusLerp,
                    'white'
                );

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

                for(let i=0;i<lineCount;i++) {
                    let rndAngle = 2 * Math.PI * Math.random();
                    let rndLength = radius * (0.5 + Math.random());
                    
                    let rndVec = new Vector().fromAng(rndAngle);
                    let rndStart = rndVec.scl(2*radius).add(newAtom.position);
                    let rndOffset = rndVec.scl(rndLength * 2 * Math.sin(Math.PI * lerp));
                    
                    renderer.context.globalAlpha = 1-lerp;

                    renderer.fillLine(
                        rndStart,
                        rndStart.add(rndOffset),
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
    handleAtomSpawner(element, deltaTime) {
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

                renderer.strokeCircle(
                    atom.position,
                    radiusLerp,
                    'white'
                );

                renderer.context.lineWidth = 1;
                renderer.context.globalAlpha = 1;
            })
            .setEnd(function(){
                let scene = this.system.getScene('Main Scene');
                scene.removeEffect(this.id);
            })
        this.scene.addEffect(effect);
    }
    handleVialStore(element, deltaTime) {
        //Try to choose n atoms to store
        let choosingCount = element.vialStoreCount;
        //If vial can't handle all, use the max it allows
        choosingCount = Math.min(choosingCount, element.maxVialAtomCount - element.vialAtomCount);

        let storingAtoms = this.atoms.filter((atom)=>{return atom.element===element && atom.state === 'storing'});
        //If already storing some ammount, only try to choose the remainder 
        choosingCount = Math.max(0,choosingCount - storingAtoms.length);

        let simulatedAtoms = this.atoms.filter((atom)=>{return atom.element===element && atom.state === 'active'});
        //If not enough atoms on simulation, only choose the available ones
        choosingCount = Math.min(simulatedAtoms.length,choosingCount);

        for(let i=0;i<choosingCount;i++) {
            let rndIdx = Math.floor(Math.random()*simulatedAtoms.length);
            let rndAtom = simulatedAtoms[rndIdx];
            if(!rndAtom) {
                continue;
            }
            rndAtom.state = 'storing';
        }
    }
}
//This is meant to be used as a generic region collider for the mouse, the renderer's function is simply a helper
class Button {
    constructor(label, type, parent, position = new Vector(0,0), size = new Vector(0,0)) {
        this.label = label;
        this.parent = parent;
        this.position = position;
        this.size = size;
        this.active = true;
        this.type = type;

        this.onClick = function() {};
        this.draw = function() {};
    }
    getBounds() {
        return {
            x: this.position.x,
            y: this.position.y,
            w: this.size.x,
            h: this.size.y
        };
    }
    setBounds(bounds) {
        this.position.x = bounds.x;
        this.position.y = bounds.y;
        this.size.x = bounds.w;
        this.size.y = bounds.h;
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
    intersects(box2) {
        let box1Start = this.position;
        let box1End = this.position.add(this.size);
        
        let box2Start = box2.position;
        let box2End = box2.position.add(box2.size);

        if(box2End.x < box1Start.x) return false;
        if(box2End.y < box1Start.y) return false;
        if(box2Start.x > box1End.x) return false;
        if(box2Start.y > box1End.y) return false;

        return true;
    }
}
class Screen {
    constructor(scene, label, position = new Vector(0,0), size = new Vector(0,0)) {
        this.label = label;
        this.scene = scene;
        this.position = position;
        this.size = size;
        this.drawIndex = 0;
        this.draw = function(){};
    }
    getBounds() {
        return {
            x: this.position.x,
            y: this.position.y,
            w: this.size.x,
            h: this.size.y
        };
    }
    setBounds(bounds) {
        this.position.x = bounds.x;
        this.position.y = bounds.y;
        this.size.x = bounds.w;
        this.size.y = bounds.h;
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
            });
            if(this.renderType!=='Minimal') {
                this.effects.forEach(function(effect) {
                    if(effect.getState()==='idle') return;
                    effect.draw(renderer, frameCount);
                });
            }
        };
        this.end = function(){};

        /*
        Render Types:
        - Default: Draws Protons, Electrons, Orbit, Spawn and Crit Effects
        - Minimal: Draw Nucleus only
        */
        this.renderType = 'Default';
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
            // Check if mouse position is within the bounds of any button
            let clicked = false;
            this.buttons.forEach(function(button) {
                if(button.getActive()===false) return;
                if(button.type!==event.type) return;
                if(clicked) return;//Already processed

                let mouseBounds = new Button('mouse','none',null,this.system.mousePosition,new Vector(1,1));
                if(button.intersects(mouseBounds)===false) return;

                let out = button.onClick(event);
                clicked = true;

                return;
            }.bind(this));
            this.system.eventBuffer.shift();
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
    setRenderType(renderType) {
        this.renderType = renderType;
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
            new Element(this, 'Helium', 'He', 2, 2, 'hsl(40, 100%, 50%)'),
            new Element(this, 'Lithium', 'Li', 3, 3, 'hsl(270, 100%, 50%)'),
            new Element(this, 'Beryllium', 'Be', 4, 4, 'hsl(20, 100%, 75%)'),
            new Element(this, 'Boron', 'B', 5, 5, 'hsl(180, 100%, 30%)'),
            new Element(this, 'Carbon', 'C', 6, 6, 'hsl(0, 0%, 50%)'),
            new Element(this, 'Nitrogen', 'N', 7, 7, 'hsl(0, 100%, 50%)'),
            new Element(this, 'Oxygen', 'O', 8, 8, 'hsl(180, 50%, 75%)'),
            new Element(this, 'Fluorine', 'F', 9, 9, 'hsl(70, 100%, 50%)'),
            new Element(this, 'Neon', 'Ne', 10, 10, 'hsl(310, 100%, 50%)'),
            new Element(this, 'Sodium', 'Na', 11, 11, 'hsl(30, 100%, 50%)'),
            new Element(this, 'Magnesium', 'Mg', 12, 12, 'hsl(240, 100%, 75%)'),
            new Element(this, 'Aluminum', 'Al', 13, 13, 'hsl(140, 25%, 50%)'),
            new Element(this, 'Silicon', 'Si', 14, 14, 'hsl(120, 0%, 50%)'),
            new Element(this, 'Phosphorus', 'P', 15, 15, 'hsl(250, 25%, 50%)'),
            new Element(this, 'Sulfur', 'S', 16, 16, 'hsl(60, 100%, 75%)'),
            new Element(this, 'Chlorine', 'Cl', 17, 17, 'hsl(90, 50%, 50%)'),
            new Element(this, 'Argonium', 'Ar', 18, 18, 'hsl(0, 75%, 25%)'),
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
            //console.warn(`Element ${symbol} not found in game data.`);
            return null;
        }
    }
    getElementByProtons(protons) {
        let element = this.elements.find(el => el.protons === protons); 
        if (element) {
            return element;
        } else {
            //console.warn(`Element with ${protons} protons not found in game data.`);
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
    drawText(position, text, color = 'white', fontSize = 20) {
        if (this.context===undefined) return;
        this.context.fillStyle = color;
        this.context.font = fontSize + 'px monospace';
        let textDimensions = this.context.measureText(text);
        let textHeight = textDimensions.actualBoundingBoxAscent;
        let textWidth = textDimensions.width;
        //Canvas draw at baseline, so we need to adjust y position
        this.context.fillText(text, position.x, position.y + textHeight / 2);
        return textWidth
    }
    fillLine(start,end,color,width = 1) {
        this.context.lineWidth = width;
        this.context.strokeStyle = color;

        this.context.moveTo(start.x,start.y);
        this.context.lineTo(end.x,end.y);
        this.context.stroke();
        
        this.context.lineWidth = 1;
    }
    fillCircle(position, radius, color = 'white') {
        if (this.context===undefined) return;
        this.context.fillStyle = color;
        this.context.beginPath();
        this.context.arc(position.x, position.y, radius, 0, Math.PI * 2);
        this.context.fill();
    }
    strokeCircle(position, radius, color = 'white') {
        if (this.context===undefined) return;
        this.context.strokeStyle = color;
        this.context.beginPath();
        this.context.arc(position.x, position.y, radius, 0, Math.PI * 2);
        this.context.stroke();
    }
    drawAtom(maxProtons, maxElectrons, position, radius, protons = 1, electrons = 1, angleOffset = 0, color1 = 'red', color2 = 'white') {
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
                let pos = new Vector(Math.cos(angle),Math.sin(angle)).scl(protonRadius).add(position);
                this.fillCircle(pos, particleSize, color1);
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
                let pos = new Vector(Math.cos(angle),Math.sin(angle)).scl(electronRadius).add(position);
                this.fillCircle(pos, particleSize, color2);
            }
            this.strokeCircle(position, electronRadius, color2);
            electronLevel++;
        }
    }
    drawVial(position,size,element) {
        let radius = 25;
        
        this.context.strokeStyle = element.color;
        this.context.globalAlpha = 0.2;
        this.context.lineWidth = 5;

        this.context.beginPath();
        this.context.arc(position.x, position.y, radius, 0, Math.PI * 2);
        this.context.stroke();

        this.context.strokeStyle = '#fff';

        this.context.beginPath();
        this.context.arc(position.x, position.y, radius+5, 0, Math.PI * 2);
        this.context.stroke();

        this.context.globalAlpha = 1;
        this.context.lineWidth = 1;

    }
    fillBox(box, color, alpha = 1) {
        this.context.globalAlpha = alpha;
        this.context.fillStyle = color;
        this.context.fillRect(
            box.position.x,
            box.position.y,
            box.size.x,
            box.size.y
        );
        this.context.globalAlpha = 1;
    }
}
class System {
    constructor() {
        this.scenes = [];
        this.sceneIndex = 0;
        this.eventBuffer = [];
        this.mousePosition = new Vector(0,0);
        this.config = new Config();

        this.renderer;
        this.gameData;

        this.shopElement = null;
        this.shopListOffset = 0;
    }
    startListeners() {
        //Set listeners
        document.addEventListener('mouseup', function(event) {
            let buttonTypes = ['click','scroll-click','right-click'];
            if(event.target !== this.renderer.canvas) return;
            this.eventBuffer.push({
                type: buttonTypes[event.button]
            });
        }.bind(this));
        document.addEventListener('mousemove', function(event) {
            let canvas = this.renderer.canvas;
            let canvasPosition = canvas.getBoundingClientRect();
            let dx = event.clientX - canvasPosition.left;
            let dy = event.clientY - canvasPosition.top;
            this.mousePosition = new Vector(dx,dy);
        }.bind(this));
        document.addEventListener('wheel',function(event){
            this.eventBuffer.push({
                deltaY: event.deltaY,
                type: 'scroll'
            });
        }.bind(this));
        document.addEventListener('contextmenu',function(event){
            event.preventDefault();
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
    //Formats big values to have the K/M/B/T suffixes for huge quantities
    formatNumber(number) {
        if(number===null) return '';
        if(number===undefined) return '';
        let digitCount = Math.ceil(Math.log10(number));
        if(digitCount <= 3) return number.toString();

        let magnitude = Math.floor((digitCount-1)/3);
        let magnitudeDict = ['','K','M','B','T','q','Q','s,','S','O','N','D'];
        let numberSuffix = magnitudeDict[magnitude];
        let decimalsToKeep = 2;
        let digitsToRemove = 3 * magnitude;
        let shiftedNumber = number/(10**digitsToRemove);
        return shiftedNumber.toFixed(decimalsToKeep) + numberSuffix;
    }
}

var system = new System();
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
    
    scene1
        .addButton(
            new Button('Switch Render Rype','click', scene1)
                .setBounds({
                    x: system.renderer.width - 90,
                    y: 20,
                    w: 70,
                    h: 20
                })
                .setOnClick(function(event) {
                    let currRenderType = this.parent.renderType;
                    if(currRenderType==='Minimal') this.parent.setRenderType('Default')
                    if(currRenderType==='Default') this.parent.setRenderType('Minimal')
                })
                .setDraw(function(renderer, frameCount) {
                    let currRenderType = this.parent.renderType;
                    let box = this.getBounds();
                    renderer.fillBox(this,'rgba(255, 255, 255)',0.6);

                    let drawPos = this.position.add(new Vector(5, 0.5 * this.size.y));
                    renderer.drawText(drawPos,'Render: ', 'white', 15);
                    drawPos = drawPos.add(new Vector(0,this.size.y));
                    renderer.drawText(drawPos,currRenderType, 'white', 15);
                })
        )
        .addButton(
            new Button('New Atom', 'scroll', scene1)
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

                    let position = new Vector().copy(system.mousePosition);
                    let effect = new Effect(system,`Click`)
                        .setTimings(0,10)
                        .setDraw(function(renderer,frameCount){
                            let lerp = this.currFrame / this.duration;
                            let radiusLerp = 5 * (1 + 2 * lerp);

                            renderer.context.globalAlpha = Math.sin(Math.PI * lerp);
                            renderer.context.lineWidth = 3;

                            renderer.strokeCircle(
                                position,
                                radiusLerp,
                                'white'
                            );

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
        )
        .addButton(
            new Button('Navigate Shop List','scroll', scene1)
                .setBounds({
                    x: 0,
                    y: 0,
                    w: 0.25 * system.renderer.width,
                    h: system.renderer.height
                })
                .setOnClick(function(event) {
                    let system = this.parent.system;

                    if(system.shopElement===null) {
                        //at main menu, scroll
                        let menuOffset = system.shopListOffset;
                        let scrollDirection = Math.sign(event.deltaY);
                        let shopCount = system.gameData.unlockedElements.length;
                        
                        if(menuOffset + scrollDirection < 0 || menuOffset + scrollDirection >= (shopCount)) {
                            return;//Do nothing, limit at edges
                        }
                        this.parent.system.shopListOffset += scrollDirection;
                    }
                    else {
                        //at upgrade menu, scroll
                        let currElement = system.gameData.getElement(system.shopElement);
                        let menuOffset = currElement.upgradeShopOffset;
                        let scrollDirection = Math.sign(event.deltaY);
                        let shopCount = currElement.upgrades.length;
                        
                        if(menuOffset + scrollDirection < 0 || menuOffset + scrollDirection >= (shopCount)) {
                            return;//Do nothing, limit at edges
                        }
                        currElement.upgradeShopOffset += scrollDirection;
                    }
                })
                .setDraw(function(renderer, frameCount) {
                })
        )
        .addButton(
            new Button('Close Shop','click', scene1)
                .setBounds({
                    x: 0.25 * system.renderer.width - 25,
                    y: 20,//0.10 * system.renderer.height,
                    w: 20,
                    h: 20
                })
                .setOnClick(function(event) {
                    if(system.shopElement === null) return;//no shop open to close

                    let upgrades = system.gameData.getElement(system.shopElement).upgrades;
                    upgrades.forEach(function(upgrade,index){
                        upgrade.button.setActive(false);//close all upgrades
                    })
                    system.closeShop();
                })
                .setDraw(function(renderer, frameCount) {
                    if(system.shopElement === null) return;

                    let box = this.getBounds();
                    renderer.fillBox(this,'rgba(255, 0, 0)',0.5);

                    renderer.drawText(new Vector(box.x + box.w/4,box.y + box.h/2),'X','white',20);
                    return;
                })
        );

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
                y: 0.10 * renderer.height,
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
                if(this.scene.system.shopElement!==null) return;

                let box = this.getBounds();
                renderer.fillBox(this,'rgba(255, 255, 255)',0.15);
                
                let system = this.scene.system; 
                let scene = system.getScene('Main Scene');
                let gameData = system.gameData;

                let startX = 25;
                let startY = 50;

                let iconSize = 30;

                //Get unlocked elements, and show starting at the general menu position
                let hiddenElements = gameData.getUnlockedElements().slice(0,system.shopListOffset);
                hiddenElements.forEach(function(element,index){
                    element.shopButton.setBounds({
                        x:0,
                        y:0,
                        w:0,
                        h:0
                    })
                })
                let displayElements = gameData.getUnlockedElements().slice(system.shopListOffset);
                displayElements.forEach(function(element, index) {

                    element.shopButton.setBounds({
                        x: startX - iconSize/2,
                        y: (startY + 50 * index) - iconSize/2,
                        w: iconSize,
                        h: iconSize
                    })
                    let box = element.shopButton.getBounds();
                                    
                    renderer.fillBox(element.shopButton,element.color,0.3);

                    let simulationScreen = system.getScene('Main Scene').getScreen('Simulation Display');
                    let atom = new Atom(scene.particleManager, element.protons, element.electrons, element.color, simulationScreen)
                        .setPosition(new Vector(startX, startY + 50 * index))
                        .setRadius(5);
                    atom.draw(renderer, frameCount);

                    let formattedScore = system.formatNumber(element.getScore());
                    renderer.drawText(new Vector(box.x + iconSize/2 + 25, box.y + iconSize/2),`${element.name} Atoms: ${formattedScore}`, 'white', 15);
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
                
                //Draw Background
                renderer.fillBox(this,element.color,0.1);

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
                renderer.drawText(new Vector(drawX,drawY),`${element.name} Shop`,'white',20);
                jumpLine();

                let particleManager = system.getScene('Main Scene').particleManager;
                let simulationScreen = system.getScene('Main Scene').getScreen('Simulation Display');
                let atom = new Atom(particleManager, element.protons, element.electrons, element.color, simulationScreen);
                
                let formattedScore = system.formatNumber(element.getScore());
                shift = renderer.drawText(new Vector(drawX,drawY),`Points: ${formattedScore}`,'white',17);
                shift += 10 * atom.getMaxLevel();
                shiftLine();
                
                atom.setPosition(new Vector(drawX, drawY))
                    .setRadius(5)
                    .draw(renderer, frameCount);

                unshiftLine();

                let upgrades = element.upgrades;
                upgrades.forEach(function(upgrade,index){
                    upgrade.button.setActive(true);
                })
                let unlockedUpgrades = upgrades.filter(function(upg){return upg.state!=='locked'});
                
                //Get unlocked elements, and show starting at the general menu position
                let hiddenUpgrades = unlockedUpgrades.slice(0,element.upgradeShopOffset);
                hiddenUpgrades.forEach(function(upgrade,index){
                    upgrade.button.setBounds({
                        x:0,
                        y:0,
                        w:0,
                        h:0
                    })
                })
                let displayUpgrades = unlockedUpgrades.slice(element.upgradeShopOffset);

                //Draw Upgrade List
                displayUpgrades.forEach(function(upgrade,index){
                    renderer.context.font = '20px monospace';
                    let textDimensions = renderer.context.measureText(upgrade.label);
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
                    renderer.fillBox(button,'#fff',0.2);
                    
                    if(upgrade.element.score<upgrade.cost || upgrade.level === upgrade.maxLevel) {
                        renderer.context.globalAlpha = 0.5;
                    }
                    let costDisplay = `${system.formatNumber(upgrade.cost)} ${upgrade.getIncrease()}`;
                    if(upgrade.level === upgrade.maxLevel) costDisplay = 'Max';
                    shift = renderer.drawText(
                        new Vector(
                            buttonBounds.x + padding.x,
                            buttonBounds.y + padding.y + heightOffset
                        ),
                        `${upgrade.label} : ${costDisplay}`,
                        'white',
                        20
                    );
                    shift += 10 * atom.getMaxLevel();
                    
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
                            new Vector(
                                drawX,
                                drawY + heightOffset
                            ),
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
        const vialUI = new Screen(scene1,'Vial UI')
            .setBounds({
                x: 0.25 * renderer.width,
                y: 0,
                w: renderer.width,
                h: 0.10 * renderer.height
            })
            .setDraw(function(renderer,frameCount){
                let vialElements = system.gameData.unlockedElements.filter(function(el){return el.maxVialAtomCount>0});
                
                let bgBox = new Button('dummy','none',this,this.position,this.size);
                renderer.fillBox(bgBox,'#fff',0.1);

                vialElements.forEach(function(element,index){
                    //Draw Vial outline
                    let radius = 25;
                    let drawPos = new Vector(index%10,index/10).floor().scl(100).add(new Vector(50 + 0.25*renderer.width,50));
                    element.setVialPosition(drawPos);
                    renderer.drawVial(drawPos,radius,element);

                    //Draw filled Vial
                    let fillPercent = element.vialAtomCount / element.maxVialAtomCount;
                    let animatedRadius = radius * (fillPercent + 0.01 * (5 * Math.sin(frameCount/10)));
                    if(animatedRadius<0) animatedRadius = 0;
                    renderer.fillCircle(drawPos,animatedRadius,element.color)

                    //Draw Text
                    let textPos = drawPos.add(new Vector(
                        -5 - 5 * Math.floor(Math.log10(element.vialAtomCount) + 1 + Math.log10(element.maxVialAtomCount)),
                        2 * radius
                    ));
                    let formattedVialCountDisplay = system.formatNumber(element.vialAtomCount) + '/' + system.formatNumber(element.maxVialAtomCount);
                    renderer.drawText(textPos,formattedVialCountDisplay,'white',15);
                })
            })

        scene1.addScreen(simulationDisplay);
        scene1.addScreen(mainUI);
        scene1.addScreen(shopUI);
        scene1.addScreen(vialUI);

    // Run the first scene
    system.getScene('Main Scene').start();
}