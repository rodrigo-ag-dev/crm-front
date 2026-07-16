type Listener = (online: boolean) => void;
type SetupListener = (setupRequired: boolean) => void;

class HealthService {
  private listeners = new Set<Listener>();
  private setupListeners = new Set<SetupListener>();
  private _online = true;
  private _setupRequired = false;

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  subscribeSetup(fn: SetupListener) {
    this.setupListeners.add(fn);
    return () => {
      this.setupListeners.delete(fn);
    };
  }

  private notify(online: boolean) {
    this._online = online;
    this.listeners.forEach((fn) => fn(online));
  }

  setOnline() {
    this.notify(true);
  }

  setOffline() {
    this.notify(false);
  }

  isOnline() {
    return this._online;
  }

  setSetupRequired(setupRequired: boolean) {
    if (this._setupRequired === setupRequired) {
      return;
    }
    this._setupRequired = setupRequired;
    this.setupListeners.forEach((fn) => fn(setupRequired));
  }

  isSetupRequired() {
    return this._setupRequired;
  }
}

export const healthService = new HealthService();
