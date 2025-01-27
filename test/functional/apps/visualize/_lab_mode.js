/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 *
 * Any modifications Copyright OpenSearch Contributors. See
 * GitHub history for details.
 */

/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import expect from '@osd/expect';
import { VISUALIZE_ENABLE_LABS_SETTING } from '../../../../src/plugins/visualizations/common/constants';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'header', 'discover', 'settings']);
  const opensearchDashboardsServer = getService('opensearchDashboardsServer');

  describe('visualize lab mode', () => {
    before(async () => {
      await opensearchDashboardsServer.uiSettings.replace({
        'discover:v2': false,
      });
    });
    it('disabling does not break loading saved searches', async () => {
      await PageObjects.common.navigateToUrl('discover', '', { useActualUrl: true });
      await PageObjects.discover.saveSearch('visualize_lab_mode_test');
      await PageObjects.discover.openLoadSavedSearchPanel();
      const hasSaved = await PageObjects.discover.hasSavedSearch('visualize_lab_mode_test');
      expect(hasSaved).to.be(true);
      await PageObjects.discover.closeLoadSaveSearchPanel();

      log.info('found saved search before toggling enableLabs mode');

      // Navigate to advanced setting and disable lab mode
      await PageObjects.header.clickStackManagement();
      await PageObjects.settings.clickOpenSearchDashboardsSettings();
      await PageObjects.settings.toggleAdvancedSettingCheckbox(VISUALIZE_ENABLE_LABS_SETTING);

      // Expect the discover still to list that saved visualization in the open list
      await PageObjects.header.clickDiscover();
      await PageObjects.discover.openLoadSavedSearchPanel();
      const stillHasSaved = await PageObjects.discover.hasSavedSearch('visualize_lab_mode_test');
      expect(stillHasSaved).to.be(true);
      log.info('found saved search after toggling enableLabs mode');
    });

    after(async () => {
      await PageObjects.discover.closeLoadSaveSearchPanel();
      await PageObjects.header.clickStackManagement();
      await PageObjects.settings.clickOpenSearchDashboardsSettings();
      await PageObjects.settings.clearAdvancedSettings(VISUALIZE_ENABLE_LABS_SETTING);
    });
  });
}
