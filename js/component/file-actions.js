import React from 'react';
import lbry from '../lbry.js';
import {Link} from '../component/link.js';
import {Icon} from '../component/common.js';
import Modal from './modal.js';
import FormField from './form.js';
import {ToolTip} from '../component/tooltip.js';
import {DropDownMenu, DropDownMenuItem} from './menu.js';

let WatchLink = React.createClass({
  propTypes: {
    streamName: React.PropTypes.string,
  },
  handleClick: function() {
    this.setState({
      loading: true,
    })
    lbry.getCostInfoForName(this.props.streamName, ({cost}) => {
      lbry.getBalance((balance) => {
        if (cost > balance) {
          this.setState({
            modal: 'notEnoughCredits',
            loading: false,
          });
        } else {
          window.location = '?watch=' + this.props.streamName;
        }
      });
    });
  },
  getInitialState: function() {
    return {
      modal: null,
      loading: false,
    };
  },
  closeModal: function() {
    this.setState({
      modal: null,
    });
  },
  render: function() {
    return (
      <div className="button-container">
        <Link button="primary" disabled={this.state.loading} label="Watch" icon="icon-play" onClick={this.handleClick} />
        <Modal contentLabel="Not enough credits" isOpen={this.state.modal == 'notEnoughCredits'} onConfirmed={this.closeModal}>
          You don't have enough LBRY credits to pay for this stream.
        </Modal>
      </div>
    );
  }
});

let FileActionsRow = React.createClass({
  _isMounted: false,
  _fileInfoSubscribeId: null,

  propTypes: {
    streamName: React.PropTypes.string,
    sdHash: React.PropTypes.string.isRequired,
    metadata: React.PropTypes.object
  },
  getInitialState: function() {
    return {
      fileInfo: null,
      modal: null,
      menuOpen: false,
      deleteChecked: false,
      attemptingDownload: false,
      attemptingRemove: false
    }
  },
  onFileInfoUpdate: function(fileInfo) {
    if (this._isMounted) {
      this.setState({
        fileInfo: fileInfo ? fileInfo : false,
        attemptingDownload: fileInfo ? false : this.state.attemptingDownload
      });
    }
  },
  tryDownload: function() {
    this.setState({
      attemptingDownload: true,
      attemptingRemove: false
    });
    lbry.getCostInfoForName(this.props.streamName, ({cost}) => {
      lbry.getBalance((balance) => {
        if (cost > balance) {
          this.setState({
            modal: 'notEnoughCredits',
            attemptingDownload: false,
          });
        } else {
          lbry.getStream(this.props.streamName, (streamInfo) => {
            if (streamInfo === null || typeof streamInfo !== 'object') {
              this.setState({
                modal: 'timedOut',
                attemptingDownload: false,
              });
            }
          });
        }
      });
    });
  },
  closeModal: function() {
    this.setState({
      modal: null,
    })
  },
  onDownloadClick: function() {
    if (!this.state.fileInfo && !this.state.attemptingDownload) {
      this.tryDownload();
    }
  },
  onOpenClick: function() {
    if (this.state.fileInfo && this.state.fileInfo.completed) {
      lbry.openFile(this.props.sdHash);
    }
  },
  handleDeleteCheckboxClicked: function(event) {
    this.setState({
      deleteChecked: event.target.checked,
    });
  },
  handleRevealClicked: function() {
    if (this.state.fileInfo && this.state.fileInfo.download_path) {
      lbry.revealFile(this.props.sdHash);
    }
  },
  handleRemoveClicked: function() {
    this.setState({
      modal: 'confirmRemove',
    });
  },
  handleRemoveConfirmed: function() {
    if (this.props.streamName) {
      lbry.removeFile(this.props.sdHash, this.props.streamName, this.state.deleteChecked);
    } else {
      alert('this file cannot be deleted because lbry is a retarded piece of shit');
    }
    this.setState({
      modal: null,
      fileInfo: false,
      attemptingDownload: false
    });
  },
  openMenu: function() {
    this.setState({
      menuOpen: !this.state.menuOpen,
    });
  },
  componentDidMount: function() {
    this._isMounted = true;
    this._fileInfoSubscribeId = lbry.fileInfoSubscribe(this.props.sdHash, this.onFileInfoUpdate);
  },
  componentWillUnmount: function() {
    this._isMounted = false;
    if (this._fileInfoSubscribeId) {
      lbry.fileInfoUnsubscribe(this.props.sdHash, this._fileInfoSubscribeId);
    }
  },
  render: function() {
    if (this.state.fileInfo === null)
    {
      return null;
    }

    const openInFolderMessage = window.navigator.platform.startsWith('Mac') ? 'Open in Finder' : 'Open in Folder',
      showMenu = !!this.state.fileInfo;

    let linkBlock;
    if (this.state.fileInfo === false && !this.state.attemptingDownload) {
      linkBlock = <Link button="text" label="Download" icon="icon-download" onClick={this.onDownloadClick} />;
    } else if (this.state.attemptingDownload || !this.state.fileInfo.completed) {
      const
        progress = this.state.fileInfo ? this.state.fileInfo.written_bytes / this.state.fileInfo.total_bytes * 100 : 0,
        label = this.state.fileInfo ? progress.toFixed(0) + '% complete' : 'Connecting...',
        labelWithIcon = <span className="button__content"><Icon icon="icon-download" /><span>{label}</span></span>;

      linkBlock = (
        <div className="faux-button-block file-actions__download-status-bar">
          <div className="faux-button-block file-actions__download-status-bar-overlay" style={{ width: progress + '%' }}>{labelWithIcon}</div>
          {labelWithIcon}
        </div>
      );
    } else {
      linkBlock = <Link label="Open" icon="icon-folder-open" onClick={this.onOpenClick} />;
    }

    return (
      <div>
        {(this.props.metadata.content_type && this.props.metadata.content_type.startsWith('video/')) ? <WatchLink streamName={this.props.streamName} /> : null}
        {this.state.fileInfo !== null || this.state.fileInfo.isMine ?
         <div className="button-container">{linkBlock}</div>
          : null}
        { showMenu ?
          <DropDownMenu>
            <DropDownMenuItem key={0} onClick={this.handleRevealClicked} label={openInFolderMessage} />
            <DropDownMenuItem key={1} onClick={this.handleRemoveClicked} label="Remove..." />
          </DropDownMenu> : '' }
        <Modal isOpen={this.state.modal == 'notEnoughCredits'} contentLabel="Not enough credits"
               onConfirmed={this.closeModal}>
          You don't have enough LBRY credits to pay for this stream.
        </Modal>
        <Modal isOpen={this.state.modal == 'timedOut'} contentLabel="Download failed"
               onConfirmed={this.closeModal}>
          LBRY was unable to download the stream <strong>lbry://{this.props.streamName}</strong>.
        </Modal>
        <Modal isOpen={this.state.modal == 'confirmRemove'} contentLabel="Not enough credits"
               type="confirm" confirmButtonLabel="Remove" onConfirmed={this.handleRemoveConfirmed}
               onAborted={this.closeModal}>
          <p>Are you sure you'd like to remove <cite>{this.props.metadata.title}</cite> from LBRY?</p>

          <label><FormField type="checkbox" checked={this.state.deleteChecked} onClick={this.handleDeleteCheckboxClicked} /> Delete this file from my computer</label>
        </Modal>
      </div>
    );
  }
});

export let FileActions = React.createClass({
  _isMounted: false,
  _fileInfoSubscribeId: null,

  propTypes: {
    streamName: React.PropTypes.string,
    sdHash: React.PropTypes.string.isRequired,
    metadata: React.PropTypes.object
  },
  getInitialState: function() {
    return {
      available: true,
      forceShowActions: false,
    }
  },
  onShowFileActionsRowClicked: function() {
    this.setState({
      forceShowActions: true,
    });
  },
  componentDidMount: function() {
    this._isMounted = true;
    lbry.getPeersForBlobHash(this.props.sdHash, (peers) => {
      if (!this._isMounted) {
        return;
      }

      this.setState({
        available: peers.length > 0,
      });
    });
  },
  componentWillUnmount: function() {
    this._isMounted = false;
  },
  render: function() {
    return (<section className="file-actions">
      {
        this.state.available || this.state.forceShowActions ?
         <FileActionsRow sdHash={this.props.sdHash} metadata={this.props.metadata} streamName={this.props.streamName} /> :
         (<div>
           <div className="button-container empty">This file is not currently available.</div>
           <div className="button-container">
             <ToolTip label="Why?"
                      body="The content on LBRY is hosted by its users. It appears there are no users connected that have this file at the moment." />
           </div>
           <div className="button-container">
             <Link label="Try Anyway" className="button-text" onClick={this.onShowFileActionsRowClicked} />
           </div>
         </div>)
      }
    </section>);
  }
});
