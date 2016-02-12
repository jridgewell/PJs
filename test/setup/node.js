import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import setup from './setup';

global.chai = chai;
global.sinon = sinon;
global.chai.use(sinonChai);

setup();
